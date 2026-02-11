# Backend Implementation Proposal (Draft)

## 1) Goal and Scope
Build a production-ready backend for the current friendship platform prototype so the existing frontend flows can move from mock state to real persistence, matching logic, and trust/safety workflows.

### Primary outcomes
- Persist onboarding profiles, preferences, and friendship graph data.
- Expose stable APIs for current flows documented in `API_SPEC.md`.
- Add real-time support for matching and conversation events.
- Add moderation, trust scoring, and event analytics pipelines.

### Non-goals (Phase 1)
- Native mobile app APIs beyond what web needs.
- Full ML-driven ranking/moderation models (we will start with rule-based + pluggable interfaces).

---

## 2) Recommended Tech Stack

### Runtime and framework
- **Node.js + TypeScript + NestJS**:
  - Strong typing and maintainability.
  - Good fit with the existing JavaScript frontend and API-first development.

### Data and infra
- **MySQL** for source-of-truth relational data (via Prisma).
- **Redis** for queues, rate limits, cooldown windows, and ephemeral match sessions.
- **Object storage** (S3-compatible) for avatars/media if needed later.
- **Redis Streams / BullMQ** for analytics/moderation event fanout and background jobs.

### Real-time
- **WebSocket gateway** for queue status, chat events, and timed decision gates.

### Auth and security
- JWT-based session tokens (short-lived access + refresh strategy).
- Row-level ownership checks in service layer.
- Rate limiting + abuse controls at edge and app layer.

---

## 3) High-Level System Design

## Core domains/services
1. **Identity Service**
   - user account creation, auth/session lifecycle, profile basics.
2. **Profile & Preference Service**
   - onboarding steps, values/interest sliders, off-limits topics.
3. **Matching Service**
   - weighted match scoring + fairness filters + cooldown logic.
4. **Conversation Service**
   - anonymous session, prompt progression, decision gates, reveal flow.
5. **Friendship Service**
   - friend graph, friend metadata, friendship starter workflows.
6. **Reflection & Trust Service**
   - post-meet reflections, trust score updates, reward events.
7. **Moderation Service**
   - report/block/panic-exit actions + moderation queue.
8. **Analytics/Event Service**
   - event ingestion and dashboard-ready aggregates.

### Deployment shape (recommended)
- Start as **modular monolith** (single deployable backend).
- Enforce clear domain boundaries in code from day one.
- Split into microservices only when throughput/team size demands it.

---

## 4) Proposed Data Model (Initial)

### Core tables
- `users`
- `user_profiles`
- `user_preferences`
- `user_values`
- `user_interests`
- `matching_queue_entries`
- `match_sessions`
- `conversation_sessions`
- `conversation_messages`
- `conversation_decision_gates`
- `friendships`
- `friendship_events`
- `meet_reflections`
- `trust_scores`
- `reports`
- `blocks`
- `daily_prompt_answers`
- `weekly_intents`
- `analytics_events`

### Indexing priorities
- Queue lookup indexes by availability window + compatibility vector hints.
- `friendships (user_id, friend_id)` unique pair constraints.
- Event append tables indexed by `user_id`, `created_at`, and event type.

### Data lifecycle
- Hard delete only for legal/compliance requirements.
- Soft-delete most user-generated entities + audit metadata.

---

## 5) API Plan (aligned to current spec)

Phase 1 should fully support current documented routes, then expand.

### Implement first (from current `API_SPEC.md`)
- `POST /api/meet_reflections`
- `POST /api/daily_prompts/answers`
- `POST /api/weekly_intent`
- `GET /api/trust_score/{user_id}`

### Add next (needed for real backend operations)
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
- `GET/PUT /api/profile`
- `POST /api/matching/queue/join`, `POST /api/matching/queue/leave`
- `GET /api/matching/session/{id}`
- `POST /api/conversations/{id}/decision-gate`
- `POST /api/conversations/{id}/reveal-consent`
- `POST /api/reports`, `POST /api/blocks`

### API quality requirements
- OpenAPI 3 contract and generated validation schemas.
- Consistent error shape (`code`, `message`, `details`, `request_id`).
- Idempotency keys for sensitive mutation endpoints.

---

## 6) Matching Logic Implementation Plan

### Scoring formula (initial)
Use weighted total from product blueprint:
- values alignment: 35%
- communication style: 25%
- interests overlap: 20%
- conversation depth: 10%
- availability overlap: 10%

### Safeguards
- avoid recent repeat pairings.
- enforce blocks and off-limits hard filters.
- apply onboarding-safe pairing rules for new users.
- add cooldown penalties for spam queueing behavior.

### Explainability
Store `match_reasons` JSON per matched pair so frontend can display “why matched”.

---

## 7) Trust, Moderation, and Safety

### Trust scoring
- Event-driven updates from reflections and conversation outcomes.
- Cooldown windows to prevent score manipulation.
- Keep both current score and component breakdown for auditability.

### Moderation
- Real-time keyword/rule checks in chat pipeline.
- Report intake with severity levels and escalation queue.
- Panic-exit endpoint that atomically ends session + blocks peer.

### Abuse prevention baseline
- IP and account rate limits.
- Behavioral throttles (repeat queue enter/leave, spam reporting).
- Device fingerprint signal integration (optional in later phase).

---

## 8) Observability and Reliability

- Structured logs with correlation/request IDs.
- Metrics: queue wait time, match success rate, reveal conversion, report rate.
- Tracing on hot paths (matching, conversation events).
- Alerting for API latency/error spikes and queue backlog growth.

---

## 9) Implementation Phases and Timeline

### Phase 0 (Week 0–1): Foundations
- Project scaffold, CI, database migrations, auth skeleton, API contract setup.

### Phase 1 (Week 2–3): Spec parity
- Implement existing endpoints from `API_SPEC.md` with persistence + tests.

### Phase 2 (Week 4–5): Matching + conversation core
- Queue, scoring engine, session lifecycle, decision gates, reveal consent.

### Phase 3 (Week 6–7): Trust/moderation + analytics
- Reflection-driven trust updates, reporting/blocking, event pipeline.

### Phase 4 (Week 8): Hardening
- Load testing, security review, observability tuning, rollout plan.

---

## 10) Testing Strategy

- **Unit tests:** scoring, trust update rules, validation logic.
- **Integration tests:** API + DB (transactional fixtures).
- **Contract tests:** OpenAPI schema conformance.
- **E2E tests:** critical user flows (queue → chat → reveal → reflection).
- **Load tests:** queue throughput and websocket fanout behavior.

Target: >80% coverage on business-critical modules (matching, trust, moderation).

---

## 11) Risks and Mitigations

1. **Risk:** Matching quality feels poor initially.
   - **Mitigation:** Rapid iteration via feature flags + weight tuning dashboard.

2. **Risk:** Real-time chat/moderation complexity increases quickly.
   - **Mitigation:** Start with minimal event set and strict payload contracts.

3. **Risk:** Abuse vectors (spam/harassment).
   - **Mitigation:** Strong defaults: rate limits, panic exit, fast report handling.

4. **Risk:** Scope creep across social features.
   - **Mitigation:** Lock Phase 1/2 definitions and defer non-critical features.

---

## 12) Decision Points for Your Review

Please confirm these before implementation starts:
1. Backend framework choice: **NestJS** (confirmed).
2. Realtime strategy: **WebSocket only** (confirmed).
3. Database: **MySQL only** in MVP (confirmed).
4. Queue/events: start with **Redis Streams / BullMQ** (confirmed).
5. Moderation level for MVP: **rule-based only** (confirmed).

Once approved, I can convert this proposal into:
- an execution checklist,
- initial schema/migration plan,
- and the first implementation PR sequence.
