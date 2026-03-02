# AI Action Firewall — Step-by-Step Implementation Plan

This document translates the project idea into an execution-ready implementation path.

## 0) Project outcome (lock first)

Build an **AI Action Firewall for Software Delivery** where every AI-proposed action is:
1. analyzed,
2. scored,
3. policy-evaluated,
4. optionally challenged,
5. either auto-executed, approval-gated, or blocked,
6. and fully logged with rollback support.

---

## 1) Week 1 — Foundation and contracts

### Step 1.1: Create a new backend domain module
- Add a top-level module in NestJS:
  - `backend/src/execution-firewall/execution-firewall.module.ts`
- Submodules/services to scaffold:
  - `action-intake`
  - `risk-scoring`
  - `policy-engine`
  - `challenge-agent`
  - `timeline-audit`

### Step 1.2: Define action input contract (DTOs)
Create DTOs for:
- `ProposeActionDto`
  - actor_id
  - natural language goal
  - proposed action type (`command`, `file_edit`, `migration`, etc.)
  - target scope (repo/file/service/environment)
  - dry-run metadata
- `ApprovalDecisionDto`
  - action_id
  - approver_id
  - decision (`approve`/`reject`)
  - rationale

### Step 1.3: Add database schema models (Prisma)
Add initial models:
- `AiAction`
- `AiActionScore`
- `AiActionPolicyEval`
- `AiActionChallenge`
- `AiActionTimelineEvent`
- `AiActionRollbackPlan`
- `OrgPolicy`
- `ApprovalRequest`

### Step 1.4: Build base API endpoints
Implement controllers for:
- `POST /api/actions/propose`
- `GET /api/actions/:id/decision`
- `POST /api/actions/:id/approve`
- `POST /api/actions/:id/execute`
- `POST /api/actions/:id/rollback`
- `GET /api/actions/:id/timeline`

### Step 1.5: Add standard error and tracing conventions
- Ensure responses include request/correlation ID.
- Return consistent error payloads (`code`, `message`, `details`, `request_id`).

---

## 2) Week 2 — Implement the first two safety pillars

### Step 2.1: Implement Rollback Safety Score engine
Heuristics (deterministic first):
- Action touches mutable vs immutable systems.
- Undo operation available (`git revert`, down migration, compensating action).
- Snapshot/checkpoint exists before execute.
- Side effects are external (email, payments, third-party APIs).

Output:
- `rollback_safety_score` in `[0..1]`
- class: `HIGH`/`MEDIUM`/`LOW`
- explanation list.

### Step 2.2: Implement Blast Radius estimator
Signals:
- Number of files/services affected.
- Environment criticality (`dev`, `staging`, `prod`).
- Data row/object impact estimate.
- Dependency fan-out estimate.

Output:
- `blast_radius_score` in `[0..1]`
- impacted entities summary
- explanation list.

### Step 2.3: Save and expose factor outputs
- Persist scores in `AiActionScore`.
- Return readable rationale in API response.

---

## 3) Week 3 — Intent drift + policy decision engine

### Step 3.1: Implement Intent Alignment checker
- Compare user objective vs action plan.
- Start with embedding or lexical similarity.
- Penalize out-of-scope files or services.

Output:
- `intent_alignment_score` in `[0..1]`
- drift flags:
  - `UNRELATED_FILE_TOUCH`
  - `SCOPE_EXPANSION`
  - `UNREQUESTED_OPERATION`

### Step 3.2: Implement Policy Engine (governance as code)
Policy config should allow:
- per-environment thresholds
- protected paths/services
- “always require approval” conditions
- “always block” conditions

Decision outcomes:
- `ALLOW_AUTO`
- `REQUIRE_APPROVAL`
- `BLOCK`

### Step 3.3: Add combined risk formula
Implement weighted score:

```text
risk = w1*(1-rollback_safety)
     + w2*(blast_radius)
     + w3*(1-intent_alignment)
     + w4*(adversarial_risk)
```

Initial default:
- `w1=0.30`, `w2=0.30`, `w3=0.25`, `w4=0.15`

Thresholds:
- `< 0.35` -> `ALLOW_AUTO`
- `0.35..0.69` -> `REQUIRE_APPROVAL`
- `>= 0.70` -> `BLOCK`

---

## 4) Week 4 — Devil’s advocate and adaptive challenge path

### Step 4.1: Implement Challenge Agent trigger rules
Run challenge only if:
- preliminary decision is not clearly safe, or
- policy says mandatory challenge for sensitive operations.

### Step 4.2: Implement challenge generation
Generate:
- top 3 failure modes
- exploit/abuse scenario candidates
- rollback stress test checklist

### Step 4.3: Feed challenge output back into risk
- Convert challenge severity into `adversarial_risk`.
- Re-evaluate final decision using policy engine.

---

## 5) Week 5 — Timeline, rollback orchestration, realtime updates

### Step 5.1: Create append-only timeline events
Emit timeline events for:
- `ACTION_PROPOSED`
- `SCORED`
- `POLICY_EVALUATED`
- `CHALLENGED`
- `DECISION_FINALIZED`
- `APPROVED` / `REJECTED`
- `EXECUTED`
- `ROLLBACK_STARTED`
- `ROLLBACK_COMPLETED` / `ROLLBACK_FAILED`

### Step 5.2: Add rollback plan generation
For each action build:
- preconditions (snapshot/checkpoint)
- exact rollback commands/actions
- post-rollback verification checks.

### Step 5.3: Publish realtime decision updates
WebSocket events:
- `action.scored`
- `action.challenge.completed`
- `action.decision.changed`
- `action.execution.updated`

---

## 6) Week 6 — UI and demo flows

### Step 6.1: Build action decision UI
Show:
- 4 factor scores + final decision
- triggered policy rules
- timeline + rollback button
- human approval dialog

### Step 6.2: Add “why blocked” and “safe alternative” explanations
- If blocked, show exact blocking reasons.
- Suggest reduced-scope alternative action.

### Step 6.3: Prepare 3 demo scenarios
1. Safe refactor -> auto-approved.
2. Medium-risk schema change -> approval required.
3. High-risk prod migration with drift -> blocked.

---

## 7) Week 7 — Quality gates and production hardening

### Step 7.1: Test matrix
- Unit tests:
  - each score engine
  - policy evaluator
  - decision aggregator
- Integration tests:
  - propose -> score -> decision -> approve -> execute
  - propose -> block -> no execution
- E2E tests:
  - timeline integrity
  - rollback flow

### Step 7.2: Reliability and observability
Track:
- decision latency
- approval latency
- block rate
- false-block override rate
- rollback success rate

### Step 7.3: Security and abuse controls
- strict authz on approvals and policy edits
- request signing for agent-originated actions
- rate limits on action submission

---

## 8) Week 8 — Launch checklist

### Step 8.1: Policy defaults for first customers
Ship baseline policy profiles:
- conservative
- balanced
- velocity-focused

### Step 8.2: Operational runbook
Document:
- how to tune thresholds
- how to investigate blocked actions
- how to recover from failed rollback.

### Step 8.3: Go-live criteria
- P95 decision time under target
- zero critical authz gaps
- demo scenarios stable and repeatable
- audit export working.

---

## 9) Definition of done (MVP)

MVP is done when the system can:
1. accept an AI action proposal,
2. run all safety checks,
3. compute final policy decision,
4. enforce block/approval/allow before execution,
5. provide full timeline + rollback support,
6. and demonstrate the 3 canonical scenarios end-to-end.
