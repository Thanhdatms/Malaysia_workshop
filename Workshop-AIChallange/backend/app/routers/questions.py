from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from ..database import get_session
from ..models import Question, QuestionFile
from ..schemas import QuestionFileOut, QuestionOut

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("", response_model=list[QuestionOut])
def list_questions(session: Session = Depends(get_session)):
    questions = session.exec(select(Question).order_by(Question.order_index)).all()
    out = []
    for q in questions:
        files = session.exec(
            select(QuestionFile).where(QuestionFile.question_id == q.id)
        ).all()
        out.append(
            QuestionOut(
                id=q.id,
                order_index=q.order_index,
                department=q.department,
                kind=q.kind,
                title=q.title,
                scenario_text=q.scenario_text,
                ai_applicable=q.ai_applicable,
                requires_files=q.requires_files,
                hide_prompt_steps=q.hide_prompt_steps,
                time_limit_minutes=q.time_limit_minutes,
                files=[
                    QuestionFileOut(
                        id=f.id, filename=f.filename, filetype=f.filetype,
                        description=f.description,
                    )
                    for f in files
                ],
            )
        )
    return out


@router.get("/{question_id}", response_model=QuestionOut)
def get_question(question_id: str, session: Session = Depends(get_session)):
    q = session.get(Question, question_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Question not found")
    files = session.exec(
        select(QuestionFile).where(QuestionFile.question_id == q.id)
    ).all()
    return QuestionOut(
        id=q.id,
        order_index=q.order_index,
        department=q.department,
        kind=q.kind,
        title=q.title,
        scenario_text=q.scenario_text,
        ai_applicable=q.ai_applicable,
        requires_files=q.requires_files,
        hide_prompt_steps=q.hide_prompt_steps,
        time_limit_minutes=q.time_limit_minutes,
        files=[
            QuestionFileOut(id=f.id, filename=f.filename, filetype=f.filetype, description=f.description)
            for f in files
        ],
    )


@router.get("/{question_id}/files/{file_id}")
def download_file(question_id: str, file_id: int, session: Session = Depends(get_session)):
    qf = session.get(QuestionFile, file_id)
    if qf is None or qf.question_id != question_id:
        raise HTTPException(status_code=404, detail="File not found")
    path = Path(qf.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on server")
    return FileResponse(path, filename=qf.filename)
