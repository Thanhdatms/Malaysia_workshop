from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Question, Submission, Team
from ..schemas import SubmissionOut, TeamJoinRequest, TeamJoinResponse, TeamOut

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.post("/join", response_model=TeamJoinResponse)
def join_team(payload: TeamJoinRequest, session: Session = Depends(get_session)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Team name cannot be empty")
    normalized = name.lower()

    team = session.exec(
        select(Team).where(Team.name_normalized == normalized)
    ).first()

    if team is None:
        team = Team(name=name, name_normalized=normalized)
        session.add(team)
        session.commit()
        session.refresh(team)
    else:
        team.last_active_at = datetime.utcnow()
        session.add(team)
        session.commit()

    submissions = session.exec(
        select(Submission).where(Submission.team_id == team.id)
    ).all()
    by_question = {s.question_id: s for s in submissions}

    all_questions = session.exec(select(Question)).all()
    out_submissions = []
    for q in all_questions:
        s = by_question.get(q.id)
        if s is None:
            out_submissions.append(SubmissionOut(question_id=q.id, status="not_started"))
        else:
            out_submissions.append(
                SubmissionOut(
                    question_id=s.question_id,
                    ai_applicable_answer=s.ai_applicable_answer,
                    ai_applicable_reasoning=s.ai_applicable_reasoning,
                    normal_prompt_text=s.normal_prompt_text,
                    normal_prompt_result=s.normal_prompt_result,
                    template_prompt_text=s.template_prompt_text,
                    template_prompt_result=s.template_prompt_result,
                    status=s.status,
                )
            )

    return TeamJoinResponse(team=TeamOut(id=team.id, name=team.name), submissions=out_submissions)
