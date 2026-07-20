# AI Challenge Workshop — "Identify, Prompt, Compare"

## 1. What this project is

A local web app for a ~10-15 person (10-15 teams, or ~10-15 people in a few teams) internal
Bossard workshop activity called **"AI Challenge: Identify, Prompt, Compare"** (see
`AI challange.png` for the original paper/slide format this digitizes).

Each **team** works through **6 workplace tasks** drawn from real Bossard-style functions
(Sales, Marketing, Inventory, Finance, HR). For every task the team must:

1. **Read the task** — scenario text, plus any attached Excel/PDF/Word file(s) they can download.
2. **Decide: Can AI solve it?** — pick Yes / Partial / No and briefly say why.
3. **Prompt like normal** — write a prompt the way they'd naturally ask any AI chatbot, then
   paste the AI's result into the app.
4. **Prompt with the template** — copy a ready-made prompt template (from a shared "Prompt
   Template Library" in the app), fill in their data, run it, and paste that result too.
5. **Compare results** — the two pasted outputs sit side by side so the team (and later,
   facilitators) can see how much a good prompt structure improves the output.

The app's job is to host this flow for multiple teams in parallel, save progress so teams can
leave and resume, and give the facilitator a dashboard to review everyone's answers at the end.

This is a **workshop training tool**, not a production system. Optimize for: simple to run on a
single laptop over local wifi, zero external dependencies, easy for a non-technical facilitator
to reset/restart, robust to ~10-15 concurrent users.

## 2. Tech stack

- **Frontend**: React (Vite + React Router). Plain CSS or CSS variables for theming — no need
  for a heavy component library. Keep it simple and readable.
- **Backend**: FastAPI (Python), served with `uvicorn`.
- **Database**: SQLite, single file on local disk (`backend/data/app.db`). No external DB
  server — this is a local-network, ~10-15 user event, SQLite is more than sufficient.
- **File storage**: uploaded/seeded Excel/PDF/Word task attachments live as plain files on disk
  under `backend/data/uploads/`, served via a FastAPI download route.
- **Hosting**: everything runs on the facilitator's laptop. Backend binds to `0.0.0.0` so
  teammates on the same wifi/LAN can hit `http://<facilitator-ip>:8000`; frontend is either
  served as a static build by FastAPI, or run via Vite dev server bound to `0.0.0.0` during the
  workshop. No cloud deployment needed.

## 3. Team / workspace flow

- Landing page asks only for a **team name** (no password, no email).
- On submit:
  - If the name doesn't exist yet → create a new team workspace, go to the dashboard.
  - If the name already exists → re-enter the *same* workspace with whatever progress was
    already saved (match should be trimmed + case-insensitive so "Team A" and "team a" resolve
    to the same team).
- Team identity is just this name string — keep auth intentionally trivial for a 30-60 minute
  internal workshop. Store team id in `localStorage` too so a refresh doesn't require retyping.

## 4. Per-question activity flow (the 4-step wizard)

Mirrors `AI challange.png`: a 4-step header (Task → Can AI Solve? → Write Prompt → Compare
Results), then per question:

1. **Task panel**: scenario/instructions text + download button(s) for any attached files
   (Excel/PDF/Word — icon + filename + size).
2. **AI-applicable panel**: Yes / Partial / No choice + short reasoning textbox. (For the one
   "cannot use AI" question, this reasoning box is effectively the main deliverable — steps 3/4
   can be skipped or left optional for that question.)
3. **Normal prompt panel**: free-text box where the team pastes the prompt they wrote *and* the
   result they got back from their own AI chat.
4. **Template prompt panel**: shows the relevant prompt template(s) from the Prompt Template
   Library (copy-to-clipboard button), a box for the filled-in prompt they used, and a box for
   the result they got back.
5. **Compare panel**: read-only side-by-side rendering of the step-3 vs step-4 pasted results,
   for the team's own reflection (and for facilitator review later).

Autosave on blur/debounce via `PUT /api/teams/{team_id}/submissions/{question_id}` — teams
should never lose work. Each question shows a status badge on the dashboard: Not Started / In
Progress / Submitted.

## 5. The 6 questions (brainstormed content — real attachments to be supplied by user later)

Distribution required by the workshop design: 2 simple prompt-only questions, 1 question AI
genuinely cannot/should not solve, 1 Excel-driven question, 1 PDF-driven question, 1 combined
Excel+PDF question. Departments touched: Sales, Marketing, Inventory, Finance, HR.

Until real files are supplied, seed the DB with these specs and generate placeholder sample
files (small mock xlsx/pdf) matching the described schema so the app is fully testable end to
end. Swap in the user's real files later without changing schema/logic.

### Q1 — Marketing · Simple (prompt only, no file)
**Title:** Draft a Product Launch Announcement
**Scenario:** Bossard Marketing is launching a new fastener line (e.g. "EcoDrive stainless
screws"). Given bullet points — product name, 3 key features, target audience, desired tone —
write a polished LinkedIn launch post.
**AI applicable:** Yes.
**Files:** none.

### Q2 — Sales · Simple (prompt only, no file)
**Title:** Respond to an Unhappy Customer
**Scenario:** Inline text of a distributor's complaint email about a late shipment of bolts,
hinting they may switch suppliers. Draft a professional, empathetic reply that keeps the
relationship and proposes next steps.
**AI applicable:** Yes.
**Files:** none.

### Q3 — HR · Cannot use AI
**Title:** Decide Whether to Terminate an Employee
**Scenario:** A short, deliberately human/judgment-heavy case file (repeated lateness, one
safety incident, mixed performance reviews, personal circumstances mentioned by the employee's
manager). The team must decide the final disciplinary/termination outcome.
**AI applicable:** No — the point of this question is for teams to articulate *why*: legal
liability, local labor-law compliance, need for human empathy/context, accountability for a
decision that materially affects someone's livelihood. UI shows only the reasoning box (steps
3/4 hidden or clearly marked optional/disabled) for this question.
**Files:** none (or an optional 1-page "employee file" PDF for flavor — not required for the
AI-cannot-solve point to land).

### Q4 — Inventory · Excel file
**Title:** Identify Urgent Reorder Items
**Scenario:** Team downloads `inventory_stock.xlsx` and must produce a prioritized reorder list
with suggested order quantities and stockout risk, using AI to help analyze/summarize the data
they copy in.
**File spec — `inventory_stock.xlsx`**, one sheet, ~30-40 rows, columns:
`SKU, Product Name, Category (Screws/Bolts/Nuts/Washers), Warehouse, Current Stock,
Reorder Point, Avg Monthly Usage, Lead Time (days), Unit Cost (RM)`.
Include a realistic mix: several rows already below reorder point, several borderline, several
healthy — so there's a genuine prioritization judgment to make.
**AI applicable:** Yes.

### Q5 — Finance · PDF file
**Title:** Extract Contract Risk Clauses
**Scenario:** Team downloads `supplier_contract.pdf`, a mock 2-3 page supplier agreement.
Task: extract payment terms, penalty clauses, termination clause, currency/FX clause, and
summarize as a risk brief with recommended negotiation points for the finance manager.
**File spec — `supplier_contract.pdf`**: mock supplier agreement with clearly labeled sections
(Payment Terms, Late Delivery Penalty, Termination, Currency Adjustment, Confidentiality) —
enough structure that a good prompt can extract it cleanly but a lazy prompt misses details.
**AI applicable:** Yes.

### Q6 — Sales + Marketing · Combined Excel + PDF
**Title:** Build a Win-Back Campaign for Declining Customers
**Scenario:** Team downloads both files and must combine them: identify the top 5 customers
with declining order volume, then draft a tailored win-back email + promotion angle per
customer segment that references relevant market conditions.
**File spec — `customer_sales.xlsx`**: columns `Customer Name, Region, Product Category,
Monthly Order Volume (last 6 months, one column per month), Last Order Date` — several
customers should show a clear declining trend, several stable/growing, as a distractor.
**File spec — `market_report.pdf`**: 1-2 page mock market/competitor snapshot (e.g. a
competitor's price cut, a regional demand shift, a raw-material cost trend) that should
plausibly inform the win-back messaging.
**AI applicable:** Yes.

> Note: the MVP does not need to parse Excel/PDF content server-side — teams download the file,
> open it themselves, and copy the relevant data/text into their AI tool of choice, then paste
> the result back into the app. Keep file handling to "store + serve for download."

## 6. Prompt Template Library

A read-only reference the team can browse/copy from during step 4 of any question. Seed it with
one template per question (tagged by question id or department), each containing clear
`{{placeholders}}` for the team to fill with their own data, e.g.:

```
Act as a {{role}}. Given the following {{data_type}}:
{{paste data here}}

Do the following:
1. {{specific instruction 1}}
2. {{specific instruction 2}}

Output format: {{desired format, e.g. table / bullet list / email}}
```

Show the library as a side panel or modal on the question page, with a "Copy" button per
template. Keep templates editable in a single seed file/table so the facilitator can tune
wording between runs without touching frontend code.

## 7. Data model (SQLite)

- **Team**: `id, name (unique, case-insensitive), created_at, last_active_at`
- **Question**: `id, order_index, department, title, scenario_text, ai_applicable
  (yes/partial/no), requires_files (bool)` — seeded from a fixed config, not editable by
  players.
- **QuestionFile**: `id, question_id, filename, filetype (xlsx/pdf/docx), storage_path`
- **PromptTemplate**: `id, question_id (nullable), title, template_text`
- **Submission**: `id, team_id, question_id, ai_applicable_answer, ai_applicable_reasoning,
  normal_prompt_text, normal_prompt_result, template_prompt_text, template_prompt_result,
  status (not_started/in_progress/submitted), updated_at` — one row per (team, question),
  upserted as they work.

## 8. API sketch

- `POST /api/teams/join {name}` → create-or-resume, returns `team_id` + all existing submissions
- `GET /api/questions` → the 6 questions incl. file metadata
- `GET /api/questions/{id}/files/{file_id}` → file download
- `GET /api/prompt-templates?question_id=` → template library
- `PUT /api/teams/{team_id}/submissions/{question_id}` → autosave upsert
- `GET /api/admin/overview` (simple shared facilitator token, e.g. header or query param
  checked against an env var — not real auth, just keeps casual teams out) → matrix of all
  teams x all questions, plus a CSV export for judging

## 9. Frontend routes

- `/` — team name join/resume screen
- `/workspace` — dashboard: 6 question cards with status badges, brief instructions
- `/workspace/question/:id` — the 4-step wizard described in §4
- `/admin` — facilitator dashboard (token-gated), read-only grid + CSV export

### 9.1 In-app AI chat

So teams never have to leave the app to reach an external AI chatbot, every question page
includes a floating "Ask AI" widget (bottom-right). It proxies to DeepSeek's chat completions
API (`POST /api/chat`, backend-side call using a server-held API key — the key is never sent to
the browser). Each question/section mounts a fresh widget instance (`key={questionId}`): no
conversation history is kept or persisted, every message is a single independent turn, and
closing/navigating away discards it. Requires `DEEPSEEK_API_KEY` in `backend/.env` (see
`backend/.env.example`) — if unset, the endpoint returns a 503 and the widget shows an error
instead of silently failing.

## 10. Branding / UI guidelines

Primary brand color — **Bossard Blue**: `rgb(64, 152, 202)` / `#4098CA`. Use it for primary
buttons, active step indicators, links, and accents — matching the reference screenshot's blue
step-boxes and blue "ACTIVITY" label.

Suggested palette (derive the rest from the reference image style):
- Primary blue: `#4098CA` (buttons, active states, links)
- Dark navy (headers, nav bar, table headers, primary headings): `#16263F`
- Page background: white `#FFFFFF`, card/section background: very light blue-gray `#F4F8FB`
- Status pills: Yes → green text/bg (`#1E9E6B` on light green), No → red (`#D7263D` on light
  red), Partial → amber (`#D89614` on light amber) — same pill style as the reference image.
- Font: clean system sans-serif (Inter / Segoe UI / system-ui stack).
- Layout cues from the reference: numbered circular step badges connected by arrows, rounded
  cards with subtle borders, generous whitespace, dark table headers with white text.

Design for a non-technical user clicking through on a laptop/tablet: large click targets, clear
current-step highlighting, obvious "Save" / autosave confirmation, minimal text entry friction
(paste-heavy, not type-heavy).

## 11. Planned folder structure

```
Workshop-AIChallange/
  CLAUDE.md
  AI challange.png              # original design reference
  Dockerfile                    # builds frontend+backend into one image (§13)
  docker-compose.yml            # app + self-hosted Postgres, for AWS EC2 (§13)
  .env.production.example       # docker-compose secrets template (§13)
  deploy/
    provision_ec2.sh            # optional: create EC2 instance via AWS CLI
    bootstrap_ec2.sh            # one-time: install Docker on the instance
    deploy.sh                   # rsync + docker compose up, for redeploys
  backend/
    app/
      main.py
      database.py
      models.py
      routers/
        teams.py
        questions.py
        submissions.py
        templates.py
        admin.py
      seed/
        questions_seed.py       # the 6 questions from §5
        templates_seed.py       # prompt template library from §6
    data/
      app.db                    # sqlite, gitignored
      uploads/
        q1_marketing/ ...
        q4_inventory/inventory_stock.xlsx
        q5_finance/supplier_contract.pdf
        q6_sales_marketing/customer_sales.xlsx
        q6_sales_marketing/market_report.pdf
    requirements.txt
  frontend/
    src/
      pages/ (Join, Dashboard, QuestionWizard, Admin)
      components/
      api/ (thin fetch client)
      theme.css                 # Bossard palette as CSS variables
    package.json
```

## 12. Running it (implemented)

The app described above is implemented under `backend/` and `frontend/`.

**First-time setup:**
```
cd backend
python -m venv venv
./venv/Scripts/pip install -r requirements.txt
cp .env.example .env   # then fill in DEEPSEEK_API_KEY for the in-app AI chat (§9.1)

cd ../frontend
npm install
```

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
This builds the frontend and starts the backend on `0.0.0.0:8000`, which serves
both the API and the built React app. It prints the LAN URL(s) to share with
teams (e.g. `http://<facilitator-ip>:8000`) and the admin dashboard URL
(`/admin`, default token `bossard-admin` — override via the `ADMIN_TOKEN`
env var before running).

The SQLite DB lives at `backend/data/app.db` and is created + seeded
automatically on first run. Delete that file to reset all teams/progress
before a fresh workshop run. Mock Excel/PDF attachments for Q4/Q5/Q6 are
generated automatically into `backend/data/uploads/` if missing (see
`backend/app/seed/generate_mock_files.py`) — replace those files in place
with real attachments when supplied, no code changes needed as long as
filenames match.

## 13. Production deployment (AWS EC2, Docker, self-hosted Postgres)

For running the workshop somewhere other than a facilitator's laptop, the app can be deployed
to a single EC2 instance via Docker Compose. This keeps the "frontend and backend on one
server" model from local dev, but swaps the sqlite file for a real Postgres database (also
self-hosted in a container on that same instance — no RDS or other external service).

**How it works:**
- `Dockerfile` (repo root) is a multi-stage build: stage 1 builds the React frontend
  (`npm run build`), stage 2 installs the FastAPI backend and copies the built frontend into
  `frontend/dist` alongside it, so the same static-file mount/SPA-fallback logic in
  `backend/app/main.py` works unchanged inside the container.
- `docker-compose.yml` (repo root) defines three services: `app` (the image above, port 8000
  exposed only on the docker network, not published to the host), `db` (`postgres:16-alpine`
  with a named volume for durable storage), and `caddy` (`caddy:2-alpine`, publishes `80`/`443`
  on the host and reverse-proxies to `app:8000`). `app` gets `DATABASE_URL` pointed at `db`
  automatically. Caddy auto-obtains a Let's Encrypt HTTPS cert for `SITE_DOMAIN` (set in `.env`)
  on first boot — no domain of your own needed, [sslip.io](https://sslip.io) works (e.g.
  `54-153-195-100.sslip.io` resolves straight to that IP). Config: `deploy/Caddyfile`.
- `backend/app/database.py` picks Postgres when `DATABASE_URL` is set (production/docker) and
  falls back to the local sqlite file when it's empty (local dev unchanged) — see
  `backend/app/config.py` for where `DATABASE_URL` is read.
- Uploaded/seeded attachment files persist in a second named volume mounted at
  `backend/data` inside the container, so they survive `docker compose up --build` redeploys.

**One-time setup:**
1. (Optional, only if you don't already have an EC2 box) provision one:
   `AWS_REGION=... KEY_NAME=... CONFIRM=yes ./deploy/provision_ec2.sh` — creates a security
   group + EC2 instance via the AWS CLI. This creates billed AWS resources; review the script
   first.
2. Bootstrap Docker on the instance (installs Docker Engine + Compose plugin, opens
   22/80/443):
   `ssh -i <key>.pem ubuntu@<ip> 'bash -s' < deploy/bootstrap_ec2.sh`
3. Copy `.env.production.example` to `.env` on the server (in the same folder as
   `docker-compose.yml`) and fill in `POSTGRES_PASSWORD`, `ADMIN_TOKEN`, `SITE_DOMAIN` (a
   domain — or an [sslip.io](https://sslip.io) hostname derived from the instance's public IP —
   pointed at this instance, used by Caddy for HTTPS), and (optionally) `DEEPSEEK_API_KEY`.
4. Make sure the instance's security group allows inbound `443` (HTTPS) as well as `80`/`22` —
   `bootstrap_ec2.sh` only opens these via `ufw` on the instance itself; on EC2 the AWS security
   group is the actual firewall and needs the same ports opened there too.

**Deploy / redeploy:**
```
EC2_HOST=<public-ip> EC2_USER=ubuntu SSH_KEY=<path-to-key>.pem ./deploy/deploy.sh
```
This rsyncs the project to the server and runs `docker compose up -d --build`. It only
recreates the `app` container — the `db` container and its volume (and Caddy's cert volume)
are untouched, so team data and the HTTPS cert both survive every redeploy. The app is then
reachable at `https://<SITE_DOMAIN>/` and the facilitator dashboard at
`https://<SITE_DOMAIN>/admin` (allow Caddy a minute on first boot to obtain the cert).

## 14. Open items / to confirm with user

- Real Excel/PDF/Word attachments for Q4/Q5/Q6 will be supplied later — placeholders described
  in §5 should be built as realistic mock files in the meantime so the full flow is testable.
- Whether the admin dashboard needs a printable/export view for scoring after the workshop
  (currently planned: CSV export).
- Whether there's a time limit / countdown per activity to surface in the UI (the reference
  image shows "30 Minutes · Group Work" — decide if this is just static display text or an
  actual timer).
