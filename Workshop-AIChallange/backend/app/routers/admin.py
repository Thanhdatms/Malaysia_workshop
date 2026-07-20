import csv
import io
import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from ..database import get_session
from ..models import Question, Submission, Team

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "bossard-admin")


def require_admin(
    x_admin_token: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
) -> None:
    provided = x_admin_token or token
    if provided != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")


def _build_rows(session: Session):
    teams = session.exec(select(Team).order_by(Team.name)).all()
    questions = session.exec(select(Question).order_by(Question.order_index)).all()
    submissions = session.exec(select(Submission)).all()
    by_key = {(s.team_id, s.question_id): s for s in submissions}

    rows = []
    for team in teams:
        for q in questions:
            s = by_key.get((team.id, q.id))
            rows.append(
                {
                    "team": team.name,
                    "question_id": q.id,
                    "question_title": q.title,
                    "department": q.department,
                    "correct_ai_applicable": q.ai_applicable,
                    "team_ai_applicable_answer": s.ai_applicable_answer if s else "",
                    "ai_applicable_reasoning": s.ai_applicable_reasoning if s else "",
                    "normal_prompt_text": s.normal_prompt_text if s else "",
                    "normal_prompt_result": s.normal_prompt_result if s else "",
                    "template_prompt_text": s.template_prompt_text if s else "",
                    "template_prompt_result": s.template_prompt_result if s else "",
                    "status": s.status if s else "not_started",
                    "updated_at": s.updated_at.isoformat() if s and s.updated_at else "",
                }
            )
    return teams, questions, rows


@router.get("/overview", dependencies=[Depends(require_admin)])
def overview(session: Session = Depends(get_session)):
    teams, questions, rows = _build_rows(session)
    return {
        "teams": [{"id": t.id, "name": t.name} for t in teams],
        "questions": [{"id": q.id, "title": q.title, "department": q.department} for q in questions],
        "rows": rows,
    }


@router.get("/export.csv", dependencies=[Depends(require_admin)])
def export_csv(session: Session = Depends(get_session)):
    _, _, rows = _build_rows(session)
    buffer = io.StringIO()
    fieldnames = [
        "team", "question_id", "question_title", "department", "correct_ai_applicable",
        "team_ai_applicable_answer", "ai_applicable_reasoning", "normal_prompt_text",
        "normal_prompt_result", "template_prompt_text", "template_prompt_result",
        "status", "updated_at",
    ]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ai_challenge_results.csv"},
    )
