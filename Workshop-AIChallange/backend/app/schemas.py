from typing import List, Optional

from pydantic import BaseModel


class TeamJoinRequest(BaseModel):
    name: str


class TeamOut(BaseModel):
    id: int
    name: str


class QuestionFileOut(BaseModel):
    id: int
    filename: str
    filetype: str
    description: Optional[str] = None


class QuestionOut(BaseModel):
    id: str
    order_index: int
    department: str
    kind: str
    title: str
    scenario_text: str
    ai_applicable: str
    requires_files: bool
    hide_prompt_steps: bool
    time_limit_minutes: Optional[int] = None
    files: List[QuestionFileOut] = []


class PromptTemplateOut(BaseModel):
    id: int
    question_id: str
    title: str
    template_text: str


class SubmissionOut(BaseModel):
    question_id: str
    ai_applicable_answer: Optional[str] = None
    ai_applicable_reasoning: Optional[str] = None
    normal_prompt_text: Optional[str] = None
    normal_prompt_result: Optional[str] = None
    template_prompt_text: Optional[str] = None
    template_prompt_result: Optional[str] = None
    status: str


class SubmissionUpdate(BaseModel):
    ai_applicable_answer: Optional[str] = None
    ai_applicable_reasoning: Optional[str] = None
    normal_prompt_text: Optional[str] = None
    normal_prompt_result: Optional[str] = None
    template_prompt_text: Optional[str] = None
    template_prompt_result: Optional[str] = None
    status: Optional[str] = None


class TeamJoinResponse(BaseModel):
    team: TeamOut
    submissions: List[SubmissionOut]
