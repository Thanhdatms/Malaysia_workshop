from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    name_normalized: str = Field(index=True, unique=True)
    department: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None


class ProcessStep(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    order_index: int = 0
    step_name: str = ""
    owner: str = ""
    time_per_step: str = ""
    problem: str = ""
    risk: str = ""


class EvaluateStep(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", index=True)
    process_step_id: int = Field(foreign_key="processstep.id", unique=True)
    data_needed: str = ""
    ai_agent: str = ""
    human_in_the_loop: bool = False
    notes_for_design: str = ""


class WorkflowGraph(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", unique=True, index=True)
    nodes_json: str = "[]"
    edges_json: str = "[]"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisSummary(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    team_id: int = Field(foreign_key="team.id", unique=True, index=True)
    content: str = ""
    updated_at: datetime = Field(default_factory=datetime.utcnow)
