from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.utcnow()


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    name_normalized: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=utcnow)
    last_active_at: datetime = Field(default_factory=utcnow)


class Question(SQLModel, table=True):
    id: str = Field(primary_key=True)  # e.g. "q1"
    order_index: int
    department: str
    kind: str  # "simple" | "no_ai" | "excel" | "pdf" | "combined"
    title: str
    scenario_text: str
    ai_applicable: str  # "yes" | "partial" | "no"
    requires_files: bool = False
    hide_prompt_steps: bool = False
    time_limit_minutes: Optional[int] = None


class QuestionFile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: str = Field(foreign_key="question.id", index=True)
    filename: str
    filetype: str  # xlsx | pdf | docx
    storage_path: str
    description: Optional[str] = None


class PromptTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: str = Field(foreign_key="question.id", index=True)
    title: str
    template_text: str


class Submission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    question_id: str = Field(foreign_key="question.id", index=True)

    ai_applicable_answer: Optional[str] = None
    ai_applicable_reasoning: Optional[str] = None

    normal_prompt_text: Optional[str] = None
    normal_prompt_result: Optional[str] = None

    template_prompt_text: Optional[str] = None
    template_prompt_result: Optional[str] = None

    status: str = "not_started"  # not_started | in_progress | submitted
    updated_at: datetime = Field(default_factory=utcnow)
