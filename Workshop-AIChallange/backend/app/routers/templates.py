from typing import Optional

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import PromptTemplate
from ..schemas import PromptTemplateOut

router = APIRouter(prefix="/api/prompt-templates", tags=["templates"])


@router.get("", response_model=list[PromptTemplateOut])
def list_templates(question_id: Optional[str] = None, session: Session = Depends(get_session)):
    stmt = select(PromptTemplate)
    if question_id:
        stmt = stmt.where(PromptTemplate.question_id == question_id)
    templates = session.exec(stmt).all()
    return [
        PromptTemplateOut(
            id=t.id, question_id=t.question_id, title=t.title, template_text=t.template_text
        )
        for t in templates
    ]
