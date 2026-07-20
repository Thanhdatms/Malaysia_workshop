import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..ai import call_deepseek
from ..database import get_session
from ..models import AnalysisSummary, EvaluateStep, ProcessStep, Team
from ..schemas import BenefitAnalysisOut

router = APIRouter(prefix="/api/teams/{team_id}/analysis", tags=["analysis"])

BENEFIT_ANALYSIS_SYSTEM_PROMPT = (
    "You are helping a corporate team understand the business impact of the "
    "AI-enhanced workflow they just designed for their own department. You are "
    "given their process steps (each with time per step, and the problem/risk "
    "noted during an Identify review) and their AI evaluation per step (which "
    "steps got an AI agent, which stay fully manual).\n\n"
    "Respond with ONLY a JSON object of this exact shape:\n"
    '{"time_saved_estimate": "short phrase, e.g. \'~3 hours per week\'", '
    '"time_saved_explanation": "one short sentence grounding the estimate in '
    'the given time-per-step values", '
    '"risks_addressed": ["specific problem/risk from the Identify notes that '
    'the newly AI-assisted steps help reduce or eliminate", ...], '
    '"benefits_short_term": ["2-4 short, concrete benefits realized within '
    'this quarter"], '
    '"benefits_long_term": ["2-4 short, concrete benefits realized over the '
    'next year"]}\n\n'
    "Rules: base risks_addressed only on real problem/risk text given for "
    "steps that now have an AI agent — never invent a risk that wasn't "
    "mentioned. Keep every list item to one short, concrete sentence — no "
    "fluff, no markdown. Benefits must be specific to this department and "
    "this workflow, not generic AI marketing claims. Do not restate step "
    "counts — those are computed separately."
)


def _get_team(team_id: int, session: Session) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def load_benefit_analysis(team_id: int, session: Session) -> BenefitAnalysisOut:
    row = session.exec(select(AnalysisSummary).where(AnalysisSummary.team_id == team_id)).first()
    if not row or not row.content:
        return BenefitAnalysisOut()
    try:
        return BenefitAnalysisOut(**json.loads(row.content))
    except (json.JSONDecodeError, TypeError):
        return BenefitAnalysisOut()


@router.get("", response_model=BenefitAnalysisOut)
def get_analysis(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)
    return load_benefit_analysis(team_id, session)


@router.put("", response_model=BenefitAnalysisOut)
def save_analysis(
    team_id: int, payload: BenefitAnalysisOut, session: Session = Depends(get_session)
):
    _get_team(team_id, session)
    row = session.exec(select(AnalysisSummary).where(AnalysisSummary.team_id == team_id)).first()
    if row is None:
        row = AnalysisSummary(team_id=team_id)
    row.content = payload.model_dump_json()
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    return payload


@router.post("/ai-generate", response_model=BenefitAnalysisOut)
async def ai_generate_analysis(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)

    steps = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team_id).order_by(ProcessStep.order_index)
    ).all()
    if not steps:
        raise HTTPException(
            status_code=400,
            detail="Complete Steps 1-3 first, then come back for insights.",
        )

    evaluate_by_step = {
        e.process_step_id: e
        for e in session.exec(select(EvaluateStep).where(EvaluateStep.team_id == team_id)).all()
    }

    steps_payload = []
    ai_assisted_count = 0
    for s in steps:
        ev = evaluate_by_step.get(s.id)
        has_agent = bool(ev and ev.ai_agent.strip())
        if has_agent:
            ai_assisted_count += 1
        steps_payload.append(
            {
                "step_name": s.step_name,
                "time_per_step": s.time_per_step,
                "problem": s.problem,
                "risk": s.risk,
                "ai_agent": ev.ai_agent if ev else "",
            }
        )

    total_steps = len(steps)
    manual_count = total_steps - ai_assisted_count

    content = await call_deepseek(
        [
            {"role": "system", "content": BENEFIT_ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "total_steps": total_steps,
                        "ai_assisted_steps": ai_assisted_count,
                        "manual_steps": manual_count,
                        "process_steps": steps_payload,
                    }
                ),
            },
        ],
        json_mode=True,
    )

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        ) from exc

    def _str_list(key: str, limit: int) -> list[str]:
        raw = parsed.get(key) or []
        if not isinstance(raw, list):
            return []
        return [str(item)[:300] for item in raw if isinstance(item, (str, int, float))][:limit]

    return BenefitAnalysisOut(
        before_manual_steps=total_steps,
        after_manual_steps=manual_count,
        after_automated_steps=ai_assisted_count,
        time_saved_estimate=str(parsed.get("time_saved_estimate") or "")[:200],
        time_saved_explanation=str(parsed.get("time_saved_explanation") or "")[:400],
        risks_addressed=_str_list("risks_addressed", 8),
        benefits_short_term=_str_list("benefits_short_term", 6),
        benefits_long_term=_str_list("benefits_long_term", 6),
    )
