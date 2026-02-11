# API Specs (OpenAPI-style)

## POST /api/meet_reflections
body:
- meet_id: uuid
- user_id: uuid
- vibe_score: int (1-5)
- meet_outcome: string (again|maybe|pass)
- feedback_tags: [string] (max 3)
response:
- success: bool

## POST /api/daily_prompts/answers
body:
- prompt_id: string
- user_id: string
- answer: string
response:
- success: bool

## POST /api/weekly_intent
body:
- user_id: string
- intent: string
response:
- success: bool

## GET /api/trust_score/{user_id}
response:
- user_id: string
- score: int
- cooldown_applied: bool

## PATCH /api/user/profile/basic
body (partial updates allowed):
- nickname: string
- ageRange: string (e.g. "18-24", "25-34")
- location: string
- topics: [string]
response:
- status: "ok"
- updatedFields: [string]

## PATCH /api/user/profile/preferences
body (partial updates allowed):
- depth: string (low|medium|high)
- frequency: string (low|medium|high)
- directness: string (low|medium|high)
- humor: string (low|medium|high)
- offLimits: [string]
response:
- status: "ok"
- updated: bool

## PATCH /api/user/profile/values
body (partial updates allowed):
- values: [string]
- interests: [string]
response:
- status: "ok"
- updated: bool

## POST /api/chat/connect
body:
- connectionUserId: uuid
response:
- chatId: uuid
- status: "connected"

## POST /api/chat/message
body:
- chatId: uuid
- message: string
response:
- chatId: uuid
- messageHistory:
  - sender: "user"
  - message: string
  - timestamp: ISO-8601
