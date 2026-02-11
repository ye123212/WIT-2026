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
