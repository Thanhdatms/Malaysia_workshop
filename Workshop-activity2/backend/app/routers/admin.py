import json
import os

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..database import get_session
from ..models import EvaluateStep, ProcessStep, Team, WorkflowGraph

router = APIRouter(prefix="/api/admin", tags=["admin"])

DEFAULT_ADMIN_TOKEN = "bossard-admin"


def _check_token(token: str = Query(...)) -> None:
    expected = os.environ.get("ADMIN_TOKEN", DEFAULT_ADMIN_TOKEN)
    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid admin token")


@router.get("/overview")
def admin_overview(session: Session = Depends(get_session), _: None = Depends(_check_token)):
    teams = session.exec(select(Team).order_by(Team.created_at)).all()

    overview = []
    for team in teams:
        process_steps = session.exec(
            select(ProcessStep)
            .where(ProcessStep.team_id == team.id)
            .order_by(ProcessStep.order_index)
        ).all()
        evaluate_steps = session.exec(
            select(EvaluateStep).where(EvaluateStep.team_id == team.id)
        ).all()
        evaluate_by_step = {e.process_step_id: e for e in evaluate_steps}
        graph = session.exec(
            select(WorkflowGraph).where(WorkflowGraph.team_id == team.id)
        ).first()

        overview.append(
            {
                "team": {
                    "id": team.id,
                    "name": team.name,
                    "department": team.department,
                    "last_active_at": team.last_active_at.isoformat(),
                    "submitted_at": team.submitted_at.isoformat() if team.submitted_at else None,
                },
                "steps": [
                    {
                        "id": ps.id,
                        "order_index": ps.order_index,
                        "step_name": ps.step_name,
                        "owner": ps.owner,
                        "time_per_step": ps.time_per_step,
                        "problem": ps.problem,
                        "risk": ps.risk,
                        "evaluate": (
                            {
                                "data_needed": evaluate_by_step[ps.id].data_needed,
                                "ai_agent": evaluate_by_step[ps.id].ai_agent,
                                "human_in_the_loop": evaluate_by_step[ps.id].human_in_the_loop,
                                "notes_for_design": evaluate_by_step[ps.id].notes_for_design,
                            }
                            if ps.id in evaluate_by_step
                            else None
                        ),
                    }
                    for ps in process_steps
                ],
                "workflow": {
                    "nodes": json.loads(graph.nodes_json) if graph else [],
                    "edges": json.loads(graph.edges_json) if graph else [],
                },
            }
        )

    return {"teams": overview}
