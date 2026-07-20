import json
from collections import deque
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..ai import call_deepseek
from ..database import get_session
from ..models import EvaluateStep, ProcessStep, Team, WorkflowGraph
from ..schemas import WorkflowEditRequest, WorkflowGraphIn, WorkflowGraphOut

router = APIRouter(prefix="/api/teams/{team_id}/workflow", tags=["workflow"])

NODE_TYPES = {"trigger", "ai_agent", "human", "approval", "output"}

DESIGN_PRINCIPLES = (
    "DESIGN PRINCIPLES — follow these closely:\n"
    "1. LOOK AT THE WHOLE PROCESS FIRST. Read every given step together before "
    "deciding on nodes — don't mechanically translate them one-by-one in the "
    "order given. If the steps were given out of logical order, silently "
    "reorder them into the correct real-world sequence in your head before "
    "designing the diagram (the diagram should reflect the correct process "
    "flow even if the input list didn't).\n"
    "2. KEEP IT LEAN — MERGE BY AGENT, NOT BY STEP. Include only the essential, "
    "decision-relevant nodes — aim for roughly 5 to 10 nodes total, never one "
    "node per process step. Specifically: if two or more (even non-adjacent) "
    "steps would realistically be handled by the same kind of AI agent doing "
    "the same kind of work (e.g. extracting data, then validating it — both a "
    "document-processing job), combine them into ONE ai_agent node rather than "
    "one node per step; do the same for consecutive human steps a single "
    "person would naturally do together. Never split a single agent's work "
    "across multiple boxes just because the input listed it as separate rows, "
    "and never fragment the process into many tiny nodes — that makes the "
    "workflow needlessly complex. Merge or drop minor/administrative steps "
    "that don't change how the AI workflow behaves. Every node should be "
    "something a manager would actually care about seeing on a diagram — no "
    "filler steps.\n"
    "3. FAVOR A REALISTIC SHAPE OVER A STRAIGHT LINE. Real workflows branch and "
    "reconverge. Where the steps suggest a genuine distinction (e.g. different "
    "problems/risks/agents noted on different steps, or a step that naturally "
    "classifies/triages the work), add an early node that splits into 2-3 "
    "parallel paths (for example: simple vs. complex, low-risk vs. high-risk, or "
    "by category). Each path may use different agents, skip straight to a human "
    "step, or take a different number of steps. Merge the paths back together "
    "once the outcome converges — typically at a shared approval gate or "
    "directly at the final output. A node MAY have more than one outgoing edge "
    "(a branch point) or more than one incoming edge (a merge point) — this is "
    "expected and encouraged whenever it reflects reality. Only invent a branch "
    "when it's genuinely supported; a single linear chain is fine when there's "
    "no meaningful decision point.\n"
    "4. Use \"approval\" nodes only where a step's human_in_the_loop is true, or "
    "where common sense demands sign-off (e.g. before money moves, before an "
    "external/customer-facing message is sent, before an irreversible action). "
    "Don't add approval gates on every step.\n"
    "5. Keep labels short (3-6 words) and descriptions to one short, practical "
    "sentence (can be an empty string)."
)

RESPONSE_FORMAT_INSTRUCTIONS = (
    "Respond with ONLY a JSON object of this exact shape: "
    '{"nodes": [{"id": "n1", "type": "trigger", "label": "...", "description": "..."}, '
    '...], "edges": [{"source": "n1", "target": "n2"}, ...]}. '
    "Node ids must be short unique strings. Do not include positions — those are "
    "computed separately."
)

WORKFLOW_SYSTEM_PROMPT = (
    "You are an AI workflow architect helping a corporate team turn their mapped "
    "process into a REALISTIC, PRACTICAL AI-enhanced workflow diagram — the kind "
    "you'd actually present to a manager, not a mechanical restating of every "
    "process step as its own box.\n\n"
    "You are given the team's process steps (from Map/Identify) and, where "
    "available, an AI evaluation per step (data needed, suggested AI agent, "
    "whether a human must stay in the loop, and design notes).\n\n"
    "Node types (use exactly these five):\n"
    '- "trigger": what starts the process (exactly one, first node, no incoming '
    "edges)\n"
    '- "ai_agent": an AI agent performing or assisting part of the work\n'
    '- "human": a step done or reviewed by a person, with no AI involved\n'
    '- "approval": a human-in-the-loop checkpoint gating an AI agent\'s output '
    "before it proceeds\n"
    '- "output": the final result of the process (exactly one node, no outgoing '
    "edges, reachable from every path)\n\n"
    + DESIGN_PRINCIPLES
    + "\n\n"
    + RESPONSE_FORMAT_INSTRUCTIONS
    + " Node ids should look like n1, n2, ..."
)

WORKFLOW_EDIT_SYSTEM_PROMPT = (
    "You are an AI workflow architect helping a corporate team refine an "
    "AI-enhanced workflow diagram they already have on their canvas. You are "
    "given: the team's underlying process steps for context, the CURRENT "
    "workflow diagram (nodes with id/type/label/description, and edges), and a "
    "change request written by the team in plain language.\n\n"
    "Node types (use exactly these five):\n"
    '- "trigger": what starts the process (exactly one, no incoming edges)\n'
    '- "ai_agent": an AI agent performing or assisting part of the work\n'
    '- "human": a step done or reviewed by a person, with no AI involved\n'
    '- "approval": a human-in-the-loop checkpoint gating an AI agent\'s output '
    "before it proceeds\n"
    '- "output": the final result of the process (exactly one, no outgoing '
    "edges, reachable from every path)\n\n"
    "Apply the team's change request to the CURRENT diagram and return the "
    "FULL updated diagram (not just the delta):\n"
    "- Keep every existing node's id, type, label, and description UNCHANGED "
    "unless the change request implies that specific node should be modified, "
    "renamed, retyped, or removed.\n"
    "- Keep every existing edge unchanged unless it must change because a node "
    "it connects to was removed/rewired, or the request explicitly asks for a "
    "different connection.\n"
    "- Only add new nodes/edges or remove nodes/edges to satisfy the request — "
    "don't otherwise redesign parts of the diagram the user didn't ask about.\n"
    "- New nodes need new ids that don't collide with existing ones.\n"
    "- If the request is ambiguous or very small (e.g. 'rename X to Y'), make "
    "the minimal sensible change.\n\n"
    + DESIGN_PRINCIPLES
    + "\n\n"
    + RESPONSE_FORMAT_INSTRUCTIONS
)


def _get_team(team_id: int, session: Session) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _build_steps_payload(team_id: int, session: Session) -> list[dict]:
    steps = session.exec(
        select(ProcessStep).where(ProcessStep.team_id == team_id).order_by(ProcessStep.order_index)
    ).all()
    evaluate_by_step = {
        e.process_step_id: e
        for e in session.exec(select(EvaluateStep).where(EvaluateStep.team_id == team_id)).all()
    }
    payload = []
    for s in steps:
        ev = evaluate_by_step.get(s.id)
        payload.append(
            {
                "step_name": s.step_name,
                "owner": s.owner,
                "time_per_step": s.time_per_step,
                "problem": s.problem,
                "risk": s.risk,
                "data_needed": ev.data_needed if ev else "",
                "ai_agent": ev.ai_agent if ev else "",
                "human_in_the_loop": ev.human_in_the_loop if ev else False,
                "notes_for_design": ev.notes_for_design if ev else "",
            }
        )
    return payload


def _parse_ai_workflow(content: str) -> tuple[list[dict], list[dict]]:
    try:
        parsed = json.loads(content)
        raw_nodes = parsed["nodes"]
        raw_edges = parsed.get("edges", [])
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        ) from exc

    nodes = []
    seen_ids = set()
    for item in raw_nodes:
        if not isinstance(item, dict):
            continue
        nid = str(item.get("id") or "").strip()
        ntype = item.get("type")
        if not nid or nid in seen_ids or ntype not in NODE_TYPES:
            continue
        seen_ids.add(nid)
        nodes.append(
            {
                "id": nid,
                "type": "workflowNode",
                "position": {"x": 0, "y": 0},
                "data": {
                    "nodeType": ntype,
                    "label": str(item.get("label") or "")[:120],
                    "description": str(item.get("description") or "")[:400],
                },
            }
        )

    if not nodes:
        raise HTTPException(
            status_code=502, detail="AI response was not valid — please try again."
        )

    edges = []
    for i, e in enumerate(raw_edges):
        if not isinstance(e, dict):
            continue
        source, target = e.get("source"), e.get("target")
        if source in seen_ids and target in seen_ids:
            edges.append({"id": f"edge-{i}", "source": source, "target": target})

    return nodes, edges


def _layout(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """Assign a simple top-down auto-layout (BFS depth per node, siblings spread out)."""
    ids = [n["id"] for n in nodes]
    outgoing: dict[str, list[str]] = {nid: [] for nid in ids}
    indegree: dict[str, int] = {nid: 0 for nid in ids}
    for e in edges:
        if e["source"] in outgoing and e["target"] in outgoing:
            outgoing[e["source"]].append(e["target"])
            indegree[e["target"]] += 1

    depth: dict[str, int] = {nid: 0 for nid in ids}
    queue = deque([nid for nid in ids if indegree[nid] == 0]) or deque(ids[:1])
    visited = set(queue)
    remaining_indegree = dict(indegree)
    while queue:
        nid = queue.popleft()
        for nxt in outgoing[nid]:
            depth[nxt] = max(depth[nxt], depth[nid] + 1)
            remaining_indegree[nxt] -= 1
            if remaining_indegree[nxt] <= 0 and nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)

    by_depth: dict[int, list[str]] = {}
    for nid in ids:
        by_depth.setdefault(depth[nid], []).append(nid)

    v_gap, h_gap = 170, 280
    positions: dict[str, dict] = {}
    for d, layer_ids in by_depth.items():
        width = (len(layer_ids) - 1) * h_gap
        start_x = 400 - width / 2
        for i, nid in enumerate(layer_ids):
            positions[nid] = {"x": start_x + i * h_gap, "y": d * v_gap}

    for n in nodes:
        n["position"] = positions.get(n["id"], {"x": 400, "y": 0})
    return nodes


@router.get("", response_model=WorkflowGraphOut)
def get_workflow(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)
    graph = session.exec(select(WorkflowGraph).where(WorkflowGraph.team_id == team_id)).first()
    if graph is None:
        return WorkflowGraphOut(nodes=[], edges=[])
    return WorkflowGraphOut(nodes=json.loads(graph.nodes_json), edges=json.loads(graph.edges_json))


@router.post("/ai-generate", response_model=WorkflowGraphOut)
async def ai_generate_workflow(team_id: int, session: Session = Depends(get_session)):
    _get_team(team_id, session)

    steps_payload = _build_steps_payload(team_id, session)
    if not steps_payload:
        raise HTTPException(
            status_code=400,
            detail="Map your process steps in Step 1 first, then try generating a workflow.",
        )

    content = await call_deepseek(
        [
            {"role": "system", "content": WORKFLOW_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "Process steps (from Map, Identify & Evaluate):\n"
                + json.dumps(steps_payload),
            },
        ],
        json_mode=True,
    )

    nodes, edges = _parse_ai_workflow(content)
    nodes = _layout(nodes, edges)
    return WorkflowGraphOut(nodes=nodes, edges=edges)


@router.post("/ai-edit", response_model=WorkflowGraphOut)
async def ai_edit_workflow(
    team_id: int, payload: WorkflowEditRequest, session: Session = Depends(get_session)
):
    _get_team(team_id, session)

    instruction = payload.instruction.strip()
    if not instruction:
        raise HTTPException(status_code=400, detail="Please describe the change you want.")

    steps_payload = _build_steps_payload(team_id, session)

    current_nodes = [
        {
            "id": n.get("id"),
            "type": (n.get("data") or {}).get("nodeType"),
            "label": (n.get("data") or {}).get("label"),
            "description": (n.get("data") or {}).get("description"),
        }
        for n in payload.nodes
        if isinstance(n, dict)
    ]
    current_edges = [
        {"source": e.get("source"), "target": e.get("target")}
        for e in payload.edges
        if isinstance(e, dict)
    ]

    user_content = (
        "Process steps (for context):\n"
        + json.dumps(steps_payload)
        + "\n\nCurrent workflow diagram:\n"
        + json.dumps({"nodes": current_nodes, "edges": current_edges})
        + "\n\nChange request from the team:\n"
        + instruction
    )

    content = await call_deepseek(
        [
            {"role": "system", "content": WORKFLOW_EDIT_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        json_mode=True,
    )

    nodes, edges = _parse_ai_workflow(content)
    nodes = _layout(nodes, edges)
    return WorkflowGraphOut(nodes=nodes, edges=edges)


@router.put("", response_model=WorkflowGraphOut)
def save_workflow(
    team_id: int, payload: WorkflowGraphIn, session: Session = Depends(get_session)
):
    _get_team(team_id, session)
    graph = session.exec(select(WorkflowGraph).where(WorkflowGraph.team_id == team_id)).first()
    if graph is None:
        graph = WorkflowGraph(team_id=team_id)
    graph.nodes_json = json.dumps(payload.nodes)
    graph.edges_json = json.dumps(payload.edges)
    graph.updated_at = datetime.utcnow()
    session.add(graph)
    session.commit()
    return WorkflowGraphOut(nodes=payload.nodes, edges=payload.edges)
