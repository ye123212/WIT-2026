# WIT Friends Prototype

Static prototype implementing onboarding, matching, post-meet reflection, and dashboard rituals.

## Added in this iteration
- Post-meet reflection modal with required vibe score + outcome and optional feedback tags.
- Reflection XP rewards, streak updates, cold-start reflection gate, trust scoring cooldowns.
- Match quality scoring function with explainable reasons shown in match UI.
- Daily prompt answer capture and weekly intent persistence.
- Analytics event emitters for key behaviors.
- OpenAPI-style specs in `API_SPEC.md`.

## Run
```bash
python3 -m http.server 4173
```
Then open http://localhost:4173

## Backend prototype (NestJS)
A backend starter now exists in `backend/` using the agreed prototype stack:
- NestJS
- WebSocket-only realtime gateway
- MySQL via Prisma schema
- Redis Streams/BullMQ queue wiring
- Rule-based moderation MVP

### Run backend locally
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run start:dev
```

Base API URL: `http://localhost:3000/api`
WebSocket namespace: `ws://localhost:3000/realtime`
