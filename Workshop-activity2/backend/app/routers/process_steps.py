import json

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..ai import call_deepseek
from ..database import get_session
from ..models import EvaluateStep, ProcessStep, Team
from ..schemas import ProcessStepIn, ProcessStepOrganizeResponse, ProcessStepOut

router = APIRouter(prefix="/api/teams/{team_id}/process-steps", tags=["process-steps"])

ORGANIZE_SYSTEM_PROMPT = (
    "You are a business process consultant. A team has mapped the steps of a "
    "process in their own department, but the list may be out of order, "
    "inconsistently described, or fragmented into steps that are really the same "
    "action split apart or duplicated.\n\n"
    "Given the department and the raw list of steps (each with owner, time per "
    "step, and a problem/risk note from an earlier review), produce a cleaned-up "
    "list:\n"
    "1. REORDER the steps into the logical sequence a real process in that "
    "department would follow, start to finish. If no department is given, infer "
    "a sensible order from the step content itself.\n"
    "2. MERGE steps that clearly represent the same real action, or that are "
    "near-duplicates, or that are so granular they should be one step — combine "
    "them into a single step with a clear name. When merging, combine the "
    "owner(s) (or write \"Multiple\" if genuinely different roles), combine the "
    "time per step sensibly (e.g. sum simple durations), and merge the problem "
    "and risk notes without repeating identical points.\n"
    "3. Do NOT over-merge — keep steps that are genuinely distinct parts of the "
    "process separate.\n"
    "4. Preserve the literal words \"No problem\" / \"No risk\" for a step only "
    "if none of the steps being merged into it reported a real problem/risk — "
    "never invent a problem or risk that wasn't in the input.\n"
    "5. Keep step names concise (a few words) and practical.\n\n"
    "Respond with ONLY a JSON object of this exact shape: "
    '{"steps": [{"step_name": "...", "owner": "...", "time_per_step": "...", '
    '"problem": "...", "risk": "..."}, ...]}, in the new logical order.'
)


def _get_team(team_id: int, session: Session) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("", response_model=list[ProcessStepOut])
def list_process_steps(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)
    rows = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team_id).order_by(ProcessStep.order_index)
    ).all()
    return [ProcessStepOut(**r.model_dump()) for r in rows]


@router.post("/ai-organize", response_model=ProcessStepOrganizeResponse)
async def ai_organize_process_steps(team_id: int, session: Session = Depends(get_session)):
    team = _get_team(team_id, session)

    steps = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team_id).order_by(ProcessStep.order_index)
    ).all()
    if not steps:
        raise HTTPException(
            status_code=400,
            detail="Map your process steps in Step 1 first, then try organizing them.",
        )

    steps_payload = [
        {
            "step_name": s.step_name,
            "owner": s.owner,
            "time_per_step": s.time_per_step,
            "problem": s.problem,
            "risk": s.risk,
        }
        for s in steps
    ]

    content = await call_deepseek(
        [
            {"role": "system", "content": ORGANIZE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {"department": team.department or "", "steps": steps_payload}
                ),
            },
        ],
        json_mode=True,
    )

    try:
        parsed = json.loads(content)
        raw_steps = parsed["steps"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        ) from exc

    result = []
    for i, item in enumerate(raw_steps):
        if not isinstance(item, dict):
            continue
        result.append(
            {
                "order_index": i,
                "step_name": str(item.get("step_name") or "")[:200],
                "owner": str(item.get("owner") or "")[:200],
                "time_per_step": str(item.get("time_per_step") or "")[:100],
                "problem": str(item.get("problem") or "")[:2000],
                "risk": str(item.get("risk") or "")[:2000],
            }
        )

    if not result:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        )

    return ProcessStepOrganizeResponse(steps=result)


@router.put("", response_model=list[ProcessStepOut])
def save_process_steps(
    team_id: int, payload: list[ProcessStepIn], session: Session = Depends(get_session)
):
    _get_team(team_id, session)

    existing = session.exec(select(ProcessStep).where(ProcessStep.team_id == team_id)).all()
    existing_by_id = {row.id: row for row in existing}

    kept_ids: set[int] = set()
    result_rows: list[ProcessStep] = []

    for item in payload:
        if item.id is not None and item.id in existing_by_id:
            row = existing_by_id[item.id]
            row.order_index = item.order_index
            row.step_name = item.step_name
            row.owner = item.owner
            row.time_per_step = item.time_per_step
            row.problem = item.problem
            row.risk = item.risk
            session.add(row)
            kept_ids.add(row.id)
            result_rows.append(row)
        else:
            row = ProcessStep(
                team_id=team_id,
                order_index=item.order_index,
                step_name=item.step_name,
                owner=item.owner,
                time_per_step=item.time_per_step,
                problem=item.problem,
                risk=item.risk,
            )
            session.add(row)
            result_rows.append(row)

    removed_ids = set(existing_by_id.keys()) - kept_ids
    for removed_id in removed_ids:
        session.delete(existing_by_id[removed_id])
        orphan_evals = session.exec(
            select(EvaluateStep).where(EvaluateStep.process_step_id == removed_id)
        ).all()
        for orphan in orphan_evals:
            session.delete(orphan)

    session.commit()
    for row in result_rows:
        session.refresh(row)

    result_rows.sort(key=lambda r: r.order_index)
    return [ProcessStepOut(**r.model_dump()) for r in result_rows]
