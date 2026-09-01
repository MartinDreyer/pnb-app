# Roadmap

High-level direction for the paint-by-numbers platform (`pnb-app` + `pnb-database` +
`paintbynumbersgenerator-master/backend`). For the day-to-day checklist, see `TODO.md`.
Keep this file and `TODO.md` current — see the "Keeping this current" note in `CLAUDE.md`.

## Done

### 2026-09-01
- Generator backend now only pulls Danish artists from SMK (`filters=[...],[creator_nationality:Danish]` in `paintbynumbersgenerator-master/backend/src/smkClient.ts`) — previously any public-domain, has-image painting could surface, Danish or not.
- Generated and published new puzzles end-to-end through the control panel (Georg Haas, then Christen Købke), confirming the SMK → generate → publish → rotation-schedule pipeline still works.
- Wired real SMK trivia into the post-completion panel: `fetchPaintingTrivia` in `pnb-app/index.html` now looks up the painting's `smk_object_number` against SMK's public API instead of returning placeholder period/style/medium/fun-fact text.

## Next steps

- **Timer** — track how long a user takes to complete a puzzle, start to finish.
- **Guessing / leaderboard** — let a user guess the painting mid-fill (before it's fully revealed); rank guessers by how early/accurately they guess, to support a leaderboard.
- **Lighter-weight SMK browsing** — the control panel feels heavy when listing multiple candidate paintings. SMK's search API already returns an `image_thumbnail` field alongside `image_native`, but `smkClient.ts`'s `mapItem` currently prefers `image_native` (full resolution) even for browse/search listings. Fix: use `image_thumbnail` for search/random listing previews, and only fetch `image_native` for the one painting actually chosen for generation.
- **Cron-first puzzle prep** — the control panel's manual generate/publish flow should become the override, not the primary path. Default operation should be a scheduled job (daily or weekly, configurable) that prepares and publishes the next puzzle automatically. Note: `ensureDailyPuzzleCoverage`/`runDailyPreparation` in `backend/src/server.ts` already implement a startup + 24h-interval coverage check — next step is making the cadence configurable (daily vs. weekly) and moving scheduling off "only runs while the Node process stays up" onto a real OS/hosting-level cron for reliability.
