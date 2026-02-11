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

---

## 13) Detailed Data Storage Draft (What to Persist)

This section is meant to **continue the backend redesign** with a concrete storage contract so implementation can proceed with fewer unknowns.

### A. Identity and Accounts

#### `users`
Core identity record.
- `id` (uuid, pk)
- `email` (varchar, unique, nullable for social-only bootstrap)
- `password_hash` (varchar, nullable for OAuth-only users)
- `status` (enum: `active`, `restricted`, `deleted`)
- `created_at`, `updated_at`
- `last_seen_at`

#### `user_auth_identities`
Store linked login providers.
- `id` (uuid, pk)
- `user_id` (fk -> users.id)
- `provider` (enum: `password`, `google`, `apple`)
- `provider_subject` (varchar)
- `created_at`
- Unique: (`provider`, `provider_subject`)

#### `user_sessions`
Refresh/session management and device revocation.
- `id` (uuid, pk)
- `user_id` (fk)
- `refresh_token_hash` (varchar)
- `device_label` (varchar)
- `ip_address` (varchar)
- `user_agent` (varchar)
- `expires_at`, `revoked_at`, `created_at`

### B. Onboarding, Profile, and Preferences

#### `user_profiles`
Public profile data safe for reveal stage.
- `user_id` (pk, fk)
- `nickname` (varchar)
- `age_range` (varchar)
- `location_city` (varchar, nullable)
- `location_country` (varchar, nullable)
- `avatar_url` (varchar, nullable)
- `bio` (varchar(280), nullable)
- `created_at`, `updated_at`

#### `user_preference_settings`
Single-row preference object used by matching.
- `user_id` (pk, fk)
- `conversation_depth` (enum: `light`, `moderate`, `deep`)
- `contact_frequency` (enum: `daily`, `weekly`, `occasional`)
- `directness_score` (tinyint, 0-100)
- `humor_score` (tinyint, 0-100)
- `response_pace` (enum: `quick`, `flexible`)
- `group_comfort` (enum: `one_to_one`, `small_groups`, `any`)
- `friendship_intention` (enum: `long_term`, `open_ended`, `activity_buddies`)
- `voice_note_ok` (bool)
- `availability_windows` (json)
- `updated_at`

#### `user_value_scores`
Normalized values for weighted scoring.
- `user_id` (fk)
- `value_key` (varchar) — e.g., `honesty`, `empathy`
- `score` (tinyint, 0-100)
- PK: (`user_id`, `value_key`)

#### `user_interest_scores`
Normalized interest sliders.
- `user_id` (fk)
- `interest_key` (varchar) — e.g., `books`, `travel`
- `score` (tinyint, 0-100)
- PK: (`user_id`, `interest_key`)

#### `user_off_limits_topics`
Hard filter topics for matching/chat prompts.
- `user_id` (fk)
- `topic_key` (varchar)
- PK: (`user_id`, `topic_key`)

#### `user_non_negotiables`
Top 3 weighted values/interests.
- `id` (uuid, pk)
- `user_id` (fk)
- `dimension` (enum: `value`, `interest`, `preference`)
- `key` (varchar)
- `priority_rank` (tinyint)
- Unique: (`user_id`, `priority_rank`)

### C. Matching and Real-Time Sessions

#### `matching_queue_entries`
Tracks active and historical queue attempts.
- `id` (uuid, pk)
- `user_id` (fk)
- `status` (enum: `active`, `matched`, `cancelled`, `expired`)
- `enqueued_at`, `dequeued_at`
- `region_key` (varchar)
- `queue_reason` (varchar, nullable)
- Indexes: (`status`, `enqueued_at`), (`user_id`, `enqueued_at`)

#### `match_sessions`
Result of pairing two users.
- `id` (uuid, pk)
- `user_a_id`, `user_b_id` (fk)
- `status` (enum: `pending`, `active_chat`, `ended`, `friend_revealed`)
- `matched_at`, `ended_at`
- `match_score` (decimal(5,2))
- `score_breakdown_json` (json)
- `match_reasons_json` (json)
- Unique guard: (`user_a_id`, `user_b_id`, `matched_at`)

#### `conversation_sessions`
Anonymous-first conversation lifecycle.
- `id` (uuid, pk)
- `match_session_id` (fk)
- `state` (enum: `anonymous`, `decision_gate`, `revealed`, `closed`)
- `started_at`, `closed_at`
- `close_reason` (enum: `mutual_end`, `user_end`, `panic_exit`, `timeout`, nullable)

#### `conversation_messages`
Message log with moderation flags.
- `id` (uuid, pk)
- `conversation_session_id` (fk)
- `sender_user_id` (fk)
- `message_text` (text)
- `contains_sensitive` (bool)
- `moderation_label` (varchar, nullable)
- `created_at`
- Indexes: (`conversation_session_id`, `created_at`)

#### `conversation_decision_gates`
Decision prompts at 10/20/30 minute checkpoints.
- `id` (uuid, pk)
- `conversation_session_id` (fk)
- `gate_minute` (int)
- `user_id` (fk)
- `decision` (enum: `reveal_yes`, `not_yet`, `end_chat`)
- `decided_at`
- Unique: (`conversation_session_id`, `gate_minute`, `user_id`)

### D. Friendship Graph and Follow-up

#### `friendships`
Canonical edge for confirmed connections.
- `id` (uuid, pk)
- `user_low_id`, `user_high_id` (ordered pair for uniqueness)
- `origin_match_session_id` (fk)
- `created_at`
- Unique: (`user_low_id`, `user_high_id`)

#### `friendship_events`
Timeline for friendship lifecycle.
- `id` (uuid, pk)
- `friendship_id` (fk)
- `event_type` (enum: `created`, `starter_completed`, `scheduled_chat`, `inactive_warning`)
- `payload_json` (json)
- `created_at`

### E. Trust, Reflection, and Safety

#### `meet_reflections`
Post-conversation reflection and signals.
- `id` (uuid, pk)
- `match_session_id` (fk)
- `conversation_session_id` (fk, nullable)
- `user_id` (fk)
- `vibe_score` (tinyint, 1-5)
- `meet_outcome` (enum: `again`, `maybe`, `pass`)
- `feedback_tags_json` (json)
- `created_at`
- Unique optional rule: one reflection per user per match.

#### `trust_scores`
Current user trust and explainability snapshots.
- `user_id` (pk, fk)
- `score` (int)
- `cooldown_applied` (bool)
- `components_json` (json)
- `updated_at`

#### `trust_score_events`
Append-only ledger to audit trust changes.
- `id` (uuid, pk)
- `user_id` (fk)
- `delta` (int)
- `source` (enum: `reflection`, `report_confirmed`, `cooldown_penalty`, `manual_review`)
- `source_ref_id` (varchar)
- `metadata_json` (json)
- `created_at`

#### `reports`
Safety report intake and workflow.
- `id` (uuid, pk)
- `reporter_user_id` (fk)
- `reported_user_id` (fk)
- `conversation_session_id` (fk, nullable)
- `reason_code` (varchar)
- `details_text` (text, nullable)
- `severity` (enum: `low`, `medium`, `high`, `critical`)
- `status` (enum: `open`, `triaged`, `actioned`, `dismissed`)
- `created_at`, `updated_at`

#### `blocks`
Hard communication blocklist.
- `id` (uuid, pk)
- `blocker_user_id` (fk)
- `blocked_user_id` (fk)
- `source` (enum: `manual`, `panic_exit`, `moderation_action`)
- `created_at`
- Unique: (`blocker_user_id`, `blocked_user_id`)

### F. Rituals, Prompts, and Engagement

#### `prompt_catalog`
System prompts for icebreakers and rituals.
- `id` (uuid, pk)
- `prompt_type` (enum: `icebreaker`, `daily`, `room`)
- `text` (text)
- `topic_tags_json` (json)
- `active` (bool)
- `created_at`

#### `daily_prompt_answers`
Persist daily prompt replies.
- `id` (uuid, pk)
- `prompt_id` (fk)
- `user_id` (fk)
- `answer` (text)
- `created_at`

#### `weekly_intents`
Current week intent per user.
- `id` (uuid, pk)
- `user_id` (fk)
- `week_start_date` (date)
- `intent` (varchar)
- `updated_at`
- Unique: (`user_id`, `week_start_date`)

#### `xp_ledger`
Gamification points with auditable source.
- `id` (uuid, pk)
- `user_id` (fk)
- `xp_delta` (int)
- `source_type` (varchar)
- `source_ref_id` (varchar, nullable)
- `created_at`

### G. Analytics and Operations

#### `analytics_events`
Event stream for product analytics.
- `id` (uuid, pk)
- `event_name` (varchar)
- `user_id` (fk, nullable)
- `session_id` (varchar, nullable)
- `properties_json` (json)
- `occurred_at` (datetime)
- `ingested_at` (datetime)

#### `idempotency_keys`
Protect mutation endpoints from duplicate submissions.
- `id` (uuid, pk)
- `key` (varchar, unique)
- `scope` (varchar)
- `request_hash` (varchar)
- `response_code` (int)
- `response_body_json` (json)
- `expires_at`

### H. Must-Have Retention and Privacy Rules
- Keep `conversation_messages` for a short configurable TTL unless the conversation has an active safety case.
- Keep `reports`, `blocks`, and `trust_score_events` longer for abuse prevention and investigations.
- Support user-data export and deletion flows with tombstones for legal audit rows.
- Never store raw passwords, only strong salted password hashes.

### I. Minimal MVP Cut (if we need to ship fast)
If we restart quickly, Phase 1 can launch with these mandatory tables only:
- `users`, `user_profiles`, `user_preference_settings`
- `user_value_scores`, `user_interest_scores`, `user_off_limits_topics`
- `matching_queue_entries`, `match_sessions`, `conversation_sessions`
- `conversation_decision_gates`, `friendships`
- `meet_reflections`, `trust_scores`, `reports`, `blocks`
- `daily_prompt_answers`, `weekly_intents`

Everything else can be progressively added once core flow is stable.
