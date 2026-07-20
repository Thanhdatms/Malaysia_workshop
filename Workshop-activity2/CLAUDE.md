# AI Workflow Designer Workshop

## 1. What this project is

A local web app for a ~10-15 person internal Bossard workshop where **functional leaders**
(Sales, Marketing, Finance, HR, Inventory, etc.) design an **AI-enhanced workflow for their own
department**, following the 5-step framework in `framework.png`: **Map → Identify → Evaluate →
Design → Automate**.

The app's step tracker has **4 steps** — Map → Identify → Design → Analysis — which cover the
first 4 stages of the `framework.png` framework (Automate = real build/deploy, out of scope; the
workshop ends at a finished design + understanding it):

1. **Map** — document the current process: list every step, who owns it, how long it takes.
2. **Identify** — go back over that same step list and flag pain points: problems and risks per
   step.
3. **Design** — the flagship step, combining the framework's Evaluate + Design stages on one
   page: first an AI-assisted **Evaluate table** (data needed per step, AI agent, human-in-the-
   loop, notes), then directly below it the **drag-and-drop workflow canvas** (arrows + editable
   boxes, in the visual style of `workflow.png`) where the team builds their actual AI-enhanced
   workflow diagram — trigger → AI agent steps → human review/approval gates → outputs.
4. **Analysis** — a read-only insights page: quick stats about the designed workflow (step count,
   % AI-assisted, human checkpoints, branch/merge points), a plain-language walkthrough of what
   each box in the canvas does, and an AI-generated narrative summary — so the team understands
   and can explain what they built before submitting.

Because real workshop teams tend to produce messy, out-of-order, or duplicated step lists after
Map/Identify, **Step 3 opens with an "Organize & Merge Steps" AI action** that reorders the raw
step list into the department's real business-process sequence and merges near-duplicate/
over-fragmented steps into one, before the team evaluates and designs. AI assistance is used
throughout as *proposals the human reviews and confirms*, never silent auto-writes to saved data
(see §4a).

The app hosts this flow for multiple teams in parallel, autosaves progress, and gives the
facilitator a read-only overview of every team's output. This is a **workshop training tool**,
not a production system — optimize for: simple to run on a single laptop over local wifi, robust
to ~10-15 concurrent users, easy for a non-technical facilitator to reset/restart. The one
external dependency is the DeepSeek API (`DEEPSEEK_API_KEY` in `backend/.env`, gitignored) used
server-side for every AI feature — the key is never exposed to the frontend/LAN.

**Reference project for conventions**: `../Workshop-AIChallange` (a sibling workshop app run by
the same team). This project should **reuse its stack, team join/resume logic, branding, and
folder layout** so the two apps feel like one family and are easy to run side by side on
workshop day. Deviate only where this app's content genuinely differs (see below).

## 2. Tech stack

- **Frontend**: React 19 (Vite + React Router 7). Plain CSS with CSS variables for theming — no
  heavy component library. Same pattern as the reference project's `theme.css`.
  - **Drag-and-drop workflow canvas (Step 4)**: [`@xyflow/react`](https://reactflow.dev) (React
    Flow) — the standard React library for node-based diagrams with draggable nodes, arrow
    edges, and inline-editable labels. This is the right tool for reproducing `workflow.png`
    (colored typed boxes, connecting arrows, editable text) without hand-rolling SVG/canvas
    logic.
- **Backend**: FastAPI (Python) + SQLModel ORM, served with `uvicorn`.
- **AI**: DeepSeek's OpenAI-compatible chat API (`deepseek-chat`), called **only from the
  backend** via a shared `app/ai.py` helper (`call_deepseek`, `httpx.AsyncClient`, optional
  `response_format: json_object` for structured proposals). The key lives in `backend/.env`
  (`DEEPSEEK_API_KEY`, gitignored, loaded via `python-dotenv`) — never hardcode it in frontend
  code or commit it. Every AI feature is a backend endpoint the frontend calls like any other
  API route; the frontend never talks to DeepSeek directly.
- **Database**: SQLite, single file on local disk (`backend/data/app.db`). No external DB
  server — local-network, ~10-15 user event, SQLite is more than sufficient.
- **Hosting**: everything runs on the facilitator's laptop. Backend binds to `0.0.0.0` so
  teammates on the same wifi/LAN can hit `http://<facilitator-ip>:8000`; frontend is either
  served via Vite dev server (dev) or built static + served by FastAPI (workshop day), same
  `start_workshop.ps1` pattern as the reference project.

## 3. Team / workspace flow (identical logic to the reference project)

- Landing page asks only for a **team name** (no password, no email).
- On submit:
  - If the name doesn't exist yet → create a new team workspace.
  - If the name already exists → re-enter the *same* workspace with whatever progress was
    already saved. Match is trimmed + case-insensitive (store both `name` and
    `name_normalized`, look up by the normalized form) so "Team A" and "team a" resolve to the
    same team.
- Team identity is just this name string — keep auth intentionally trivial for a workshop.
  Persist `team_id`/`team_name` in `localStorage` too so a page refresh doesn't require
  retyping.
- One workspace = one team's full Map/Identify/Design/Analysis progress. Teams design a
  workflow **for their own department**, so ask for the team's **department/function name**
  alongside the team name on join (used as a display label throughout, e.g. "Team Falcon —
  Finance", and fed into AI prompts so proposals match the department's real process).

## 4. Step-by-step flow

A persistent step tracker (`.step-track` pill/arrow component) shows **Map → Identify → Design →
Analysis** across the top of every workspace page, with the current step highlighted. Teams can
move between steps freely (no forced linear lock) — but Back/Next buttons at the bottom of each
step nudge the intended order, ending in Design → Analysis → "Mark as Submitted" → Review recap →
Confirm → Congratulations.

### Step 1 — Map (`/workspace/map`)

An editable table the team builds row-by-row (add row / delete row):

| Step | Owner | Time per step |
|---|---|---|

- **Step**: free text, the process step name.
- **Owner**: free text (person/role who does it).
- **Time per step**: free text or short duration string (e.g. "15 min", "2 days") — keep it a
  plain string, not a strict numeric field, since teams will phrase it loosely.

This is the base row list (`ProcessStep`) that Steps 2 and 3 both build on.

### Step 2 — Identify (`/workspace/identify`)

**Same table carried over from Step 1** (Step / Owner / Time, still editable) **plus two new
columns**:

| Step | Owner | Time per step | Problem | Risk |
|---|---|---|---|---|

- **Problem**: free text describing the pain point in that step, or explicitly "No problem" via
  a quick-select toggle that clears/greys the text box, so empty isn't ambiguous with "not yet
  reviewed."
- **Risk**: free text describing risk at that step, or "No risk". Same toggle pattern.

Writes back to the same `ProcessStep` rows created in Step 1.

### Step 3 — Design (`/workspace/design`) — the flagship step

Combines the framework's Evaluate + Design stages on one page, top to bottom:

**3a. Organize Your Steps** — real teams' Map/Identify lists tend to come out messy: out of
order, or fragmented/duplicated across near-identical steps. An **"✨ Organize & Merge Steps"**
button sends the team's department + current `ProcessStep` rows to AI, which returns a
reordered, deduplicated list matching the department's real business-process sequence. Shown as
a review-only preview (reusing `ProcessStepTable` in read-only mode) with **Confirm & Apply** /
**Discard** — confirming calls the normal bulk `PUT /process-steps` (replacing the step list;
any `EvaluateStep` rows tied to steps that got merged away are cascade-deleted server-side, same
as a manual row delete). Nothing changes until confirmed.

**3b. Evaluate AI Applicability** — a reduced table, one row per `ProcessStep`:

| Step | Data needed | AI Agent | Human-in-the-loop | Notes for Step 4 |
|---|---|---|---|---|

- **Step**: read-only, pulled from Step 1.
- **Data needed**: free text — what data/inputs this step's AI would need.
- **AI Agent**: free text with autocomplete from a seeded list ("Classification Agent",
  "Drafting/Generation Agent", "Summarization Agent", "OCR/Extraction Agent", "RAG/Knowledge
  Agent", "Approval Router", "Data Analysis Agent", "Translation Agent") — teams can type a
  custom one.
- **Human-in-the-loop**: checkbox (ticked = a human must review/approve this step's AI output).
- **Notes for Step 4** *(optional)*: sequencing hint, tool/system name, or condition/branch note
  the team wants carried into the workflow design.

An **"✨ AI Proposal"** button fills the whole table from the team's Map/Identify data (same
propose → review/edit → **Confirm & Save** / **Discard** pattern as §3a; while a proposal is
pending, normal autosave is paused so nothing is written until the human confirms). Writes to
`EvaluateStep`, one-to-one with `ProcessStep` (via `process_step_id`).

**3c. Build the Workflow Diagram** — the drag-and-drop canvas, visually modeled on
`workflow.png`:

- A **node palette** with typed, pre-colored node templates the user drags onto the canvas:
  - **Trigger** (navy `#16263f`), **AI Agent** (teal `#1c7f8c`), **Human Step** (brown
    `#8a4b1f`), **Approval Gate** (purple `#6a3fb5`), **Output** (green `#1e9e6b`) — a
    color-coded dot + label per type doubles as the legend.
- Each node is a rounded box with **editable inline text** (bold title + smaller description
  line), click to edit in place.
- Nodes are **freely dragged** to reposition; users **draw arrows** by dragging from one node's
  handle to another, including branching (one node → multiple targets) and merging (multiple
  sources → one target).
- **"✨ Generate with AI" / "✨ Regenerate with AI"**: on first landing on Step 3 with an empty
  canvas (whether reached via "Next" from Step 2 or by clicking the step tracker), the canvas
  **auto-generates** from the current Map/Identify/Evaluate data — no button press needed.
  Re-running later (manual button) asks for confirmation first if the canvas isn't empty
  (destructive — replaces the whole diagram). The AI is prompted to keep it **lean** (~5-10
  nodes, not one box per process step) and to **branch and reconverge like a real process**
  (e.g. a triage step splitting into simple/complex paths that merge back at a shared approval
  or the output) rather than defaulting to a straight line; node positions are computed
  server-side with a BFS-depth auto-layout, not guessed by the AI.
- **AI edit prompt bar**: a free-text box ("Ask AI to change the workflow…") above the canvas
  lets the team request a specific change in plain language (e.g. "add a fraud check before
  sending replies"). The backend sends the *current* graph + instruction and asks AI to return
  the full updated graph, preserving everything not asked to change. Applies immediately and
  autosaves — no separate confirm step, since it's an explicit, targeted user request (unlike
  the destructive full regenerate).
- Autosaves the whole graph (`nodes[]` + `edges[]`) as one JSON blob per team, debounced.

### Step 4 — Analysis (`/workspace/analysis`) — understand what you built

Read-only insights page, computed mostly client-side from data already loaded, plus one AI call:

- **At a Glance stat tiles**: process step count, % of steps with an AI agent assigned, human
  checkpoint count, workflow box count, branch points, merge points (all derived from
  `ProcessStep` / `EvaluateStep` / `WorkflowGraph` already in the team's context — no extra
  backend call needed).
- **"How Your Workflow Works"**: every canvas node listed top-to-bottom (sorted by y position),
  each showing its type pill, label, and description — a plain-language walkthrough alongside
  the visual diagram from Step 3.
- **AI Summary**: a short (120-200 word) plain-language narrative — what triggers the process,
  what each AI agent roughly does, where humans stay in the loop, what the end result is — meant
  to help the team explain their design confidently. Auto-fetched on landing, with a
  "✨ Regenerate" button. Not persisted — regenerated on each visit.

From here, **"Mark as Submitted"** leads to `/workspace/review` (a final read-only recap of
Steps 1-3) → **Confirm & Submit** (calls `POST /api/teams/{team_id}/submit`, sets
`Team.submitted_at`) → `/workspace/done` (Congratulations screen).

## 4a. AI assistance pattern (used throughout Step 3 and 4)

Every AI feature in this app follows one of two conventions — never a silent write to saved
data:

1. **Propose → review/edit → confirm** (Organize Steps, Evaluate AI Proposal): the AI call
   returns a proposal only; the endpoint does **not** touch the database. The frontend fills the
   relevant form/table with the proposal, pauses its normal autosave (`useAutosave`'s `enabled`
   option), and shows **Confirm & Save/Apply** + **Discard** buttons. Only Confirm persists it
   (via the existing normal `PUT` endpoint); Discard reverts local state, nothing is saved.
2. **Direct apply, still explicit** (Generate/Regenerate Workflow, AI Edit Workflow, Organize
   Steps once *confirmed*): the user's click or typed instruction is itself the explicit
   authorization, so the result is applied to local state immediately and flows through the
   page's normal autosave — no extra confirm click. Destructive variants (Regenerate over a
   non-empty canvas) still get a `window.confirm()` guard first.

All AI endpoints share `backend/app/ai.py`'s `call_deepseek()` helper and live under the
resource they affect (e.g. `POST /api/teams/{team_id}/process-steps/ai-organize`, not a
separate `/ai` router), so each stays close to the data model + validation it depends on.

## 5. Data model (SQLite via SQLModel)

- **Team**: `id, name, name_normalized (unique), department, created_at, last_active_at,
  submitted_at (nullable)` — `submitted_at` is set once by `POST /submit` at the end of the
  Review step; used for the "Submitted ✓" badge on the dashboard and in the admin overview.
- **ProcessStep**: `id, team_id, order_index, step_name, owner, time_per_step, problem, risk`
  — one row per process step, shared/extended across Steps 1 and 2, and reordered/merged in
  place by Step 3's "Organize & Merge Steps" AI action.
- **EvaluateStep**: `id, team_id, process_step_id (FK, unique), data_needed, ai_agent,
  human_in_the_loop (bool), notes_for_design` — Step 3b, one-to-one with `ProcessStep`
  (cascade-deleted when its `ProcessStep` is removed, e.g. by the Organize action or a manual
  row delete).
- **WorkflowGraph**: `id, team_id (unique), nodes_json (text), edges_json (text), updated_at`
  — Step 3c, stored as a single JSON document per team (simplest correct model for a freeform
  node/edge canvas; avoids over-normalizing something React Flow already treats as a graph
  object). `nodes_json` is an array of `{id, type: "workflowNode", position:{x,y},
  data:{nodeType, label, description}}` (`nodeType` is one of trigger/ai_agent/human/approval/
  output); `edges_json` is an array of `{id, source, target}`.

None of the AI proposal/summary endpoints below have their own table — they're stateless: given
the team's current saved data, call DeepSeek, validate/shape the response, and return it. The
caller decides whether/how to persist it via the normal `PUT` endpoints.

## 6. API sketch

- `POST /api/teams/join {name, department}` → create-or-resume, returns `team` + all saved
  process steps + evaluate rows + workflow graph.
- `POST /api/teams/{team_id}/submit` → sets `Team.submitted_at`, returns `team`.
- `GET /api/teams/{team_id}/process-steps` → list (Steps 1/2 data).
- `PUT /api/teams/{team_id}/process-steps` → bulk upsert the full row list (autosave sends the
  whole table on change; rows omitted from the payload are deleted, cascading their
  `EvaluateStep`).
- `POST /api/teams/{team_id}/process-steps/ai-organize` → AI-reordered/merged step list
  (proposal only, not persisted — frontend confirms via the `PUT` above).
- `GET /api/teams/{team_id}/evaluate-steps` → list (Step 3b data).
- `PUT /api/teams/{team_id}/evaluate-steps` → bulk upsert.
- `POST /api/teams/{team_id}/evaluate-steps/ai-proposal` → AI-filled evaluate rows (proposal
  only).
- `GET /api/teams/{team_id}/workflow` → `{nodes, edges}`.
- `PUT /api/teams/{team_id}/workflow` → save `{nodes, edges}` (debounced autosave from the
  canvas).
- `POST /api/teams/{team_id}/workflow/ai-generate` → AI-designed workflow from Map/Identify/
  Evaluate data (proposal only; server computes node `position`s via BFS-depth auto-layout).
- `POST /api/teams/{team_id}/workflow/ai-edit {instruction, nodes, edges}` → AI-modified version
  of the *given* graph (lets the frontend send unsaved local edits, not just the last-saved
  state) applying one plain-language change request; also re-laid-out server-side.
- `POST /api/teams/{team_id}/analysis/ai-summary` → short plain-language narrative summary of
  the team's process + workflow (not persisted, regenerated per request).
- `POST /api/chat {messages}` → general workshop-assistant chat proxy (used by the floating
  `ChatWidget`, not tied to a specific team/step).
- `GET /api/admin/overview` (simple shared facilitator token via header/query param checked
  against an env var, default `bossard-admin` — not real auth) → every team's Map/Identify/
  Evaluate data plus a read-only render of each team's workflow graph and `submitted_at`, for
  facilitator review at the end.

## 7. Frontend routes

- `/` — team name + department join/resume screen
- `/workspace` — step tracker + summary of the team's progress across all 4 steps
- `/workspace/map` — Step 1 table
- `/workspace/identify` — Step 2 table
- `/workspace/design` — Step 3: Organize action + Evaluate table + React Flow canvas
- `/workspace/analysis` — Step 4: stats, node walkthrough, AI summary
- `/workspace/review` — read-only recap of Steps 1-3, "Confirm & Submit"
- `/workspace/done` — Congratulations screen after submitting
- `/admin` — facilitator dashboard (token-gated), read-only view across all teams, click a team
  card for its full detail (tables + read-only canvas)

## 8. Branding / UI guidelines

Match the reference project's palette exactly (same workshop family, same laptop-projector
setting) — primary brand color **Bossard Blue** `rgb(64, 152, 202)` / `#4098CA`.

- Primary blue: `#4098CA` (buttons, active states, links, active step-tracker items)
- Blue-dark (hover): `#2f7aa8`
- Blue-light (chips/backgrounds): `#e8f3fa`
- Dark navy (headers, nav bar, table headers, primary headings): `#16263F`
- Page background: `#F4F8FB`, card background: `#FFFFFF`
- Borders: `#DBE6EE`
- Text: `#1C2B3A`, muted text: `#5B6B7C`
- Status colors: green `#1E9E6B` (good/complete), red `#D7263D` (risk/problem flagged), amber
  `#B9800C` (in progress / partial)
- Font: `'Segoe UI', Inter, system-ui, -apple-system, sans-serif`
- Reuse the reference project's `theme.css` CSS variables and core component classes
  (`.card`, `.btn`, `.btn-primary`, `.pill`, table styles, `.step-track`) as a starting point —
  copy and extend rather than reinvent, so both workshop apps look like one product.
- Canvas node type colors (Step 3c) follow `workflow.png`'s legend (Trigger navy, AI Agent teal,
  Human Step brown, Approval Gate purple, Output green) — these are distinct from the general UI
  palette above because they encode node *type*, not app chrome.
- Design for a non-technical functional leader clicking through on a laptop: large click
  targets, obvious autosave confirmation (small `SaveIndicator`), minimal typing friction on
  Steps 1-2 (short free-text cells), and a canvas that's forgiving — easy to undo/delete a node,
  hard to accidentally lose the whole graph. Every AI proposal is reviewable and reversible
  (Confirm/Discard) before it touches saved data — see §4a.

## 9. Folder structure (as implemented)

```
Workshop-activity2/
  CLAUDE.md
  framework.png                 # 5-step framework reference
  workflow.png                  # Step 3c canvas visual target
  images/                       # additional UI reference mockups (step tracker, admin, etc.)
  backend/
    .env                        # DEEPSEEK_API_KEY (gitignored, create manually)
    app/
      main.py                   # loads .env, mounts routers + built frontend
      database.py
      models.py                 # Team, ProcessStep, EvaluateStep, WorkflowGraph
      schemas.py
      ai.py                     # call_deepseek() — shared DeepSeek client for all routers
      routers/
        teams.py                 # join/resume, submit
        process_steps.py         # Steps 1/2 CRUD + ai-organize
        evaluate_steps.py        # Step 3b CRUD + ai-proposal
        workflow.py              # Step 3c CRUD + ai-generate + ai-edit + auto-layout
        analysis.py              # Step 4 ai-summary
        chat.py                  # general ChatWidget proxy
        admin.py
    data/
      app.db                    # sqlite, gitignored
    requirements.txt
    run_dev.ps1
  frontend/
    src/
      pages/ (Join, Workspace, MapStep, IdentifyStep, DesignStep, Analysis,
               ReviewSubmission, Congratulations, Admin)
      components/
        StepTrack.jsx, StepPageShell.jsx, WorkspaceShell.jsx, TopBar.jsx
        ProcessStepTable.jsx    # shared table used by Map + Identify + read-only recaps
        EvaluateTable.jsx       # Step 3b table, also reused read-only in Review/Admin
        SaveIndicator.jsx
        ChatWidget.jsx          # floating assistant, mounted globally once a team has joined
        workflow/
          WorkflowCanvas.jsx    # React Flow wrapper, supports readOnly + compact modes
          WorkflowNode.jsx      # single node component, styled by data.nodeType
          NodePalette.jsx
          WorkflowActionsContext.jsx
          nodeConfig.js         # NODE_TYPES color/label map, shared by canvas + Analysis
      hooks/
        useAutosave.js          # debounced autosave with enabled/markSaved for AI-proposal flows
      context/
        TeamContext.jsx
      api/
        client.js
      theme.css
    package.json
  start_workshop.ps1            # same one-command launcher pattern as reference project
```

## 10. Running it

**First-time setup**: create `backend/.env` (gitignored) with:
```
DEEPSEEK_API_KEY=sk-...
```
Every AI feature (§4a) fails with a clear 500 if this is missing — the rest of the app (Steps
1-2, manual Step 3 editing, admin) works fine without it.

**Development** (hot reload, two terminals):
```
# terminal 1
cd backend
./run_dev.ps1          # uvicorn --reload on :8000

# terminal 2
cd frontend
npm run dev            # Vite dev server on :5173, proxies /api to :8000
```
Open `http://localhost:5173`.

**Workshop day** (one command, one port, LAN-reachable):
```
./start_workshop.ps1
```
Builds the frontend and starts the backend on `0.0.0.0:8000`, serving both the API and the
built React app. Prints LAN URL(s) to share with teams and the admin dashboard URL (`/admin`,
token via `ADMIN_TOKEN` env var, default `bossard-admin`).

The SQLite DB lives at `backend/data/app.db`, created + tables auto-migrated on first run.
Delete that file to reset all teams/progress before a fresh workshop run.

## 11. Open items / to confirm with user

- Exact seed list of example AI agent names for the Step 3b autocomplete (currently a
  placeholder set — swap for whatever vocabulary the workshop facilitators actually want to
  teach; also referenced inside the `ai-proposal`/`ai-generate` prompts as suggested names).
- Whether the admin dashboard needs an export (CSV/PDF/PNG-of-canvas) for judging/archiving
  after the workshop, or read-only in-browser review is enough.
- Whether team department is a free-text field or a fixed dropdown (Sales/Marketing/Finance/
  HR/Inventory/...) — free-text assumed for now to avoid blocking an unlisted function; it also
  feeds directly into the "Organize & Merge Steps" and workflow-generation AI prompts, so a
  fixed list could make those proposals more consistent across teams in the same department.
- Cost/rate-limiting for the DeepSeek calls isn't enforced anywhere (auto-generate-on-first-
  visit, regenerate, organize, proposal, edit, and analysis summary are all uncapped per team) —
  fine for a single ~10-15 team workshop session, worth revisiting if reused for a larger event.
