from typing import Optional

from pydantic import BaseModel


class TeamJoinRequest(BaseModel):
    name: str
    department: str = ""


class TeamOut(BaseModel):
    id: int
    name: str
    department: str
    submitted_at: Optional[str] = None


class ProcessStepIn(BaseModel):
    id: Optional[int] = None
    order_index: int = 0
    step_name: str = ""
    owner: str = ""
    time_per_step: str = ""
    problem: str = ""
    risk: str = ""


class ProcessStepOut(ProcessStepIn):
    id: int


class OrganizedProcessStep(BaseModel):
    order_index: int = 0
    step_name: str = ""
    owner: str = ""
    time_per_step: str = ""
    problem: str = ""
    risk: str = ""


class ProcessStepOrganizeResponse(BaseModel):
    steps: list[OrganizedProcessStep]


class EvaluateStepIn(BaseModel):
    process_step_id: int
    data_needed: str = ""
    ai_agent: str = ""
    human_in_the_loop: bool = False
    notes_for_design: str = ""


class EvaluateStepOut(EvaluateStepIn):
    id: int


class EvaluateProposal(BaseModel):
    process_step_id: int
    data_needed: str = ""
    ai_agent: str = ""
    human_in_the_loop: bool = False
    notes_for_design: str = ""


class EvaluateProposalResponse(BaseModel):
    proposals: list[EvaluateProposal]


class WorkflowNode(BaseModel):
    id: str
    type: str
    position: dict
    data: dict


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None


class WorkflowGraphIn(BaseModel):
    nodes: list[dict] = []
    edges: list[dict] = []


class WorkflowGraphOut(BaseModel):
    nodes: list[dict]
    edges: list[dict]


class WorkflowEditRequest(BaseModel):
    instruction: str
    nodes: list[dict] = []
    edges: list[dict] = []


class BenefitAnalysisOut(BaseModel):
    before_manual_steps: int = 0
    after_manual_steps: int = 0
    after_automated_steps: int = 0
    time_saved_estimate: str = ""
    time_saved_explanation: str = ""
    risks_addressed: list[str] = []
    benefits_short_term: list[str] = []
    benefits_long_term: list[str] = []


class TeamJoinResponse(BaseModel):
    team: TeamOut
    process_steps: list[ProcessStepOut]
    evaluate_steps: list[EvaluateStepOut]
    workflow: WorkflowGraphOut
    benefit_analysis: BenefitAnalysisOut = BenefitAnalysisOut()
