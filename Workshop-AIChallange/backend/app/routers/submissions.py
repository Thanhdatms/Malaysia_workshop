from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Question, Submission, Team
from ..schemas import SubmissionOut, SubmissionUpdate

router = APIRouter(prefix="/api/teams/{team_id}/submissions", tags=["submissions"])


@router.get("", response_model=list[SubmissionOut])
def get_submissions(team_id: int, session: Session = Depends(get_session)):
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    submissions = session.exec(
        select(Submission).where(Submission.team_id == team_id)
    ).all()
    return [
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
        for s in submissions
    ]


@router.put("/{question_id}", response_model=SubmissionOut)
def upsert_submission(
    team_id: int,
    question_id: str,
    payload: SubmissionUpdate,
    session: Session = Depends(get_session),
):
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    question = session.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    submission = session.exec(
        select(Submission).where(
            Submission.team_id == team_id, Submission.question_id == question_id
        )
    ).first()
    if submission is None:
        submission = Submission(team_id=team_id, question_id=question_id)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(submission, field, value)
    submission.updated_at = datetime.utcnow()

    session.add(submission)
    team.last_active_at = datetime.utcnow()
    session.add(team)
    session.commit()
    session.refresh(submission)

    return SubmissionOut(
        question_id=submission.question_id,
        ai_applicable_answer=submission.ai_applicable_answer,
        ai_applicable_reasoning=submission.ai_applicable_reasoning,
        normal_prompt_text=submission.normal_prompt_text,
        normal_prompt_result=submission.normal_prompt_result,
        template_prompt_text=submission.template_prompt_text,
        template_prompt_result=submission.template_prompt_result,
        status=submission.status,
    )
