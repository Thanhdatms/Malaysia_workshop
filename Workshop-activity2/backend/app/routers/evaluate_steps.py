import json

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..ai import call_deepseek
from ..database import get_session
from ..models import EvaluateStep, ProcessStep, Team
from ..schemas import EvaluateProposalResponse, EvaluateStepIn, EvaluateStepOut

router = APIRouter(prefix="/api/teams/{team_id}/evaluate-steps", tags=["evaluate-steps"])

AGENT_SUGGESTIONS = [
    "Classification Agent",
    "Drafting / Generation Agent",
    "Summarization Agent",
    "OCR / Extraction Agent",
    "RAG / Knowledge Agent",
    "Approval Router",
    "Data Analysis Agent",
    "Translation Agent",
]

PROPOSAL_SYSTEM_PROMPT = (
    "You are an AI workflow consultant helping a corporate team evaluate which of their "
    "process steps could be enhanced with AI. You are given the team's mapped process "
    "steps (from a Map step) with owner, time per step, and any problem/risk notes "
    "(from an Identify step). For EVERY step given, propose: "
    "1) data_needed - short phrase of what data/inputs an AI would need for that step; "
    "2) ai_agent - a short agent/tool name (prefer one of: "
    + ", ".join(AGENT_SUGGESTIONS)
    + " — or a concise custom name if none fit); "
    "3) human_in_the_loop - true if a human should review/approve the AI's output before "
    "it proceeds (favor true for anything risky, customer-facing, or judgment-heavy); "
    "4) notes_for_design - one short optional sentence with a sequencing hint, tool name, "
    "or condition useful when building the workflow diagram later (can be empty string). "
    "If a step's problem/risk says there is no real pain point, it's still fine to "
    "propose light AI assistance, or you may set ai_agent to an empty string if AI does "
    "not clearly help that step. "
    'Respond with ONLY a JSON object of the exact shape: '
    '{"proposals": [{"process_step_id": <int>, "data_needed": "...", "ai_agent": "...", '
    '"human_in_the_loop": true, "notes_for_design": "..."}, ...]} '
    "with exactly one entry per given step, matching process_step_id exactly."
)


def _get_team(team_id: int, session: Session) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.get("", response_model=list[EvaluateStepOut])
def list_evaluate_steps(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)
    rows = session.exec(select(EvaluateStep).where(EvaluateStep.team_id == team_id)).all()
    return [EvaluateStepOut(**r.model_dump()) for r in rows]


@router.post("/ai-proposal", response_model=EvaluateProposalResponse)
async def ai_propose_evaluate_steps(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)

    steps = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team_id).order_by(ProcessStep.order_index)
    ).all()
    if not steps:
        raise HTTPException(
            status_code=400,
            detail="Map your process steps in Step 1 first, then try the AI proposal again.",
        )

    steps_payload = [
        {
            "process_step_id": s.id,
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
            {"role": "system", "content": PROPOSAL_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "Process steps (from Map & Identify):\n" + json.dumps(steps_payload),
            },
        ],
        json_mode=True,
    )

    try:
        parsed = json.loads(content)
        raw_proposals = parsed["proposals"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        ) from exc

    valid_ids = {s.id for s in steps}
    proposals_by_step = {}
    for item in raw_proposals:
        if not isinstance(item, dict):
            continue
        pid = item.get("process_step_id")
        if pid not in valid_ids:
            continue
        proposals_by_step[pid] = {
            "process_step_id": pid,
            "data_needed": str(item.get("data_needed") or "")[:2000],
            "ai_agent": str(item.get("ai_agent") or "")[:200],
            "human_in_the_loop": bool(item.get("human_in_the_loop", False)),
            "notes_for_design": str(item.get("notes_for_design") or "")[:2000],
        }

    ordered = [
        proposals_by_step[s.id]
        for s in steps
        if s.id in proposals_by_step
    ]
    return EvaluateProposalResponse(proposals=ordered)


@router.put("", response_model=list[EvaluateStepOut])
def save_evaluate_steps(
    team_id: int, payload: list[EvaluateStepIn], session: Session = Depends(get_session)
):
    _get_team(team_id, session)

    valid_process_step_ids = set(
        session.exec(
            select(ProcessStep.id).where(ProcessStep.team_id == team_id)
        ).all()
    )

    existing = session.exec(select(EvaluateStep).where(EvaluateStep.team_id == team_id)).all()
    existing_by_process_step = {row.process_step_id: row for row in existing}

    result_rows: list[EvaluateStep] = []

    for item in payload:
        if item.process_step_id not in valid_process_step_ids:
            raise HTTPException(
                status_code=400,
                detail=f"process_step_id {item.process_step_id} does not belong to this team",
            )
        row = existing_by_process_step.get(item.process_step_id)
        if row is None:
            row = EvaluateStep(team_id=team_id, process_step_id=item.process_step_id)
        row.data_needed = item.data_needed
        row.ai_agent = item.ai_agent
        row.human_in_the_loop = item.human_in_the_loop
        row.notes_for_design = item.notes_for_design
        session.add(row)
        result_rows.append(row)

    session.commit()
    for row in result_rows:
        session.refresh(row)

    return [EvaluateStepOut(**r.model_dump()) for r in result_rows]
