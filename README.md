# WIT Friends Prototype

Interactive front-end prototype for a values-first friendship platform.

## Included UX
- Multi-step onboarding wizard with progress bar and profile summary.
- Anonymous-first matching with timed checkpoints (demo: 20/40/60s for 10/20/30 min).
- Gamification cards (XP, streaks, companion evolution, quests, badges).
- Community room cards with join actions and join-by-code flow.
- Dashboard with privacy controls and activity chart.
- Light/Dark theme toggle, toast notifications, and localStorage persistence.

## Run locally

```bash
python3 -m http.server 4173
```

Open: <http://localhost:4173>

## Notes
- This is a static prototype (no backend/API).
- State is persisted in browser localStorage.
