import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import EvaluateStep, ProcessStep, Team, WorkflowGraph
from ..schemas import (
    EvaluateStepOut,
    ProcessStepOut,
    TeamJoinRequest,
    TeamJoinResponse,
    TeamOut,
    WorkflowGraphOut,
)
from .analysis import load_benefit_analysis

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _team_out(team: Team) -> TeamOut:
    return TeamOut(
        id=team.id,
        name=team.name,
        department=team.department,
        submitted_at=team.submitted_at.isoformat() if team.submitted_at else None,
    )


@router.post("/join", response_model=TeamJoinResponse)
def join_team(payload: TeamJoinRequest, session: Session = Depends(get_session)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name cannot be empty")
    normalized = name.lower()

    team = session.exec(select(Team).where(Team.name_normalized == normalized)).first()

    if team is None:
        team = Team(name=name, name_normalized=normalized, department=payload.department.strip())
        session.add(team)
        session.commit()
        session.refresh(team)
    else:
        team.last_active_at = datetime.utcnow()
        if payload.department.strip():
            team.department = payload.department.strip()
        session.add(team)
        session.commit()
        session.refresh(team)

    process_steps = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team.id).order_by(ProcessStep.order_index)
    ).all()
    evaluate_steps = session.exec(
        select(EvaluateStep).where(EvaluateStep.team_id == team.id)
    ).all()
    graph = session.exec(select(WorkflowGraph).where(WorkflowGraph.team_id == team.id)).first()

    return TeamJoinResponse(
        team=_team_out(team),
        process_steps=[ProcessStepOut(**ps.model_dump()) for ps in process_steps],
        evaluate_steps=[EvaluateStepOut(**es.model_dump()) for es in evaluate_steps],
        workflow=WorkflowGraphOut(
            nodes=json.loads(graph.nodes_json) if graph else [],
            edges=json.loads(graph.edges_json) if graph else [],
        ),
        benefit_analysis=load_benefit_analysis(team.id, session),
    )


@router.post("/{team_id}/submit", response_model=TeamOut)
def submit_team(team_id: int, session: Session = Depends(get_session)):
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    team.submitted_at = datetime.utcnow()
    session.add(team)
    session.commit()
    session.refresh(team)
    return _team_out(team)
