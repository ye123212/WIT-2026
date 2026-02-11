# WIT Friends Prototype

Interactive front-end prototype for a values-first friendship platform.

## Included UX
- 4-step onboarding wizard with smooth step animation, progress bar, live preview card, avatar selector, chips, and profile summary.
- Anonymous-first matching with animated timer ring (color thresholds), checkpoints (demo 20/40/60s), report modal, reactions, and prompt rating.
- Gamification cards (XP, streaks, companion evolution, quests, locked/earned badges).
- Community room filtering, join-by-code flow, and live activity feed.
- Dashboard cards with privacy controls, trend chart, next actions, and reward countdown.
- Light/Dark theme toggle, top-right toast notifications, confetti bursts, localStorage persistence.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
- Static prototype (no backend/API).
- State persists in browser localStorage.
