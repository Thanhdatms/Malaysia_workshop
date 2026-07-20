from sqlmodel import Session, select

from ..database import UPLOADS_DIR
from ..models import PromptTemplate, Question, QuestionFile
from .generate_mock_files import generate_all
from .questions_seed import QUESTIONS
from .templates_seed import TEMPLATES

FOLDER_BY_QUESTION = {
    "q1": "q1_marketing",
    "q2": "q2_sales",
    "q3": "q3_hr",
    "q4": "q4_inventory",
    "q5": "q5_finance",
    "q6": "q6_combined",
}


def seed_if_empty(session: Session) -> None:
    existing = session.exec(select(Question)).first()
    if existing is not None:
        return

    # Make sure the placeholder attachments exist on disk before we point
    # QuestionFile rows at them.
    generate_all()

    for q in QUESTIONS:
        question = Question(
            id=q["id"],
            order_index=q["order_index"],
            department=q["department"],
            kind=q["kind"],
            title=q["title"],
            scenario_text=q["scenario_text"],
            ai_applicable=q["ai_applicable"],
            requires_files=q["requires_files"],
            hide_prompt_steps=q["hide_prompt_steps"],
            time_limit_minutes=q.get("time_limit_minutes"),
        )
        session.add(question)

        for f in q["files"]:
            folder = FOLDER_BY_QUESTION[q["id"]]
            storage_path = (UPLOADS_DIR / folder / f["filename"]).as_posix()
            session.add(
                QuestionFile(
                    question_id=q["id"],
                    filename=f["filename"],
                    filetype=f["filetype"],
                    storage_path=storage_path,
                    description=f.get("description"),
                )
            )

    for t in TEMPLATES:
        session.add(
            PromptTemplate(
                question_id=t["question_id"],
                title=t["title"],
                template_text=t["template_text"],
            )
        )

    session.commit()


def ensure_upload_files_exist() -> None:
    """Regenerate any missing placeholder files (e.g. after a manual cleanup)."""
    any_missing = False
    for folder, filename in [
        ("q4_inventory", "inventory_stock.xlsx"),
        ("q5_finance", "supplier_contract.pdf"),
        ("q6_combined", "customer_sales.xlsx"),
        ("q6_combined", "market_report.pdf"),
    ]:
        if not (UPLOADS_DIR / folder / filename).exists():
            any_missing = True
            break
    if any_missing:
        generate_all()
