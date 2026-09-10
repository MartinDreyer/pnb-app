# Roadmap

High-level direction for the paint-by-numbers platform (`pnb-app` + `pnb-database` +
`paintbynumbersgenerator-master/backend`). For the day-to-day checklist, see `TODO.md`.
Keep this file and `TODO.md` current — see the "Keeping this current" note in `CLAUDE.md`.

## Done

### 2026-09-01
- Generator backend now only pulls Danish artists from SMK (`filters=[...],[creator_nationality:Danish]` in `paintbynumbersgenerator-master/backend/src/smkClient.ts`) — previously any public-domain, has-image painting could surface, Danish or not.
- Generated and published new puzzles end-to-end through the control panel (Georg Haas, then Christen Købke), confirming the SMK → generate → publish → rotation-schedule pipeline still works.
- Wired real SMK trivia into the post-completion panel: `fetchPaintingTrivia` in `pnb-app/index.html` now looks up the painting's `smk_object_number` against SMK's public API instead of returning placeholder period/style/medium/fun-fact text.

### 2026-09-08
- Removed the topbar logo image (and its now-unused `logoAlt` i18n key/`.logo` CSS) from `pnb-app/index.html`.
- Fixed top/side safe-area clipping on notch/Dynamic Island devices: `.topbar` and `.zoomControls` now pad with `env(safe-area-inset-*)`.
- Set up Xcode 26.6 (Intel-compatible; Xcode 27+ dropped Intel support) and CocoaPods on the dev Mac, and ran the app on a physical iPhone via a free Apple ID (Personal Team) — TestFlight itself still needs a paid Apple Developer Program enrollment, not yet done.
- Added a home/menu screen to `pnb-app/index.html`: opening the app now shows a "Today's puzzle" card plus a history list of past weeks (queried from `rotation_schedule` via new `fetchPuzzleHistory`/`fetchPuzzleById`), instead of loading straight into today's puzzle. Navigation between menu/puzzle is reload-based (`location.hash` + `location.reload()`), since `main()`'s setup was never designed to run twice per page life.
- Added client-side (localStorage) per-puzzle painting progress persistence (`pnb_progress_v1`), since the new menu makes it possible to navigate away from an in-progress puzzle for the first time.

### 2026-09-10
- Replaced the default placeholder Capacitor artwork (the generic blue "X" mark) with a custom app icon and launch splash — a simple four-swatch "paint chip" mark in the app's actual palette colors, generated from one parametric SVG (`rsvg-convert`) into iOS's `AppIcon.appiconset`/`Splash.imageset` and all 11 Android `drawable-*/splash.png` density/orientation buckets.
- Added `@capacitor/splash-screen` and wired `pnb-app/index.html`'s `boot()` to keep the native splash up (`launchAutoHide: false` in `capacitor.config.json`) until translations + puzzle/menu data finish loading, instead of it disappearing instantly and leaving a blank white flash.

## Next steps

- **Android launcher icons** — `android/app/src/main/res/mipmap-*/ic_launcher*.png` are still the default Capacitor placeholder; only the splash images were refreshed this round.
- **Package for TestFlight** — enroll the dev Apple ID in the paid Apple Developer Program ($99/yr); Personal Team accounts can't generate App Store distribution profiles.
- **History pagination** — `fetchPuzzleHistory()` is capped at the last 52 weekly puzzles with no pagination; revisit once real usage exceeds a year of history.
- **Timer** — track how long a user takes to complete a puzzle, start to finish.
- **Guessing / leaderboard** — let a user guess the painting mid-fill (before it's fully revealed); rank guessers by how early/accurately they guess, to support a leaderboard.
- **Lighter-weight SMK browsing** — the control panel feels heavy when listing multiple candidate paintings. SMK's search API already returns an `image_thumbnail` field alongside `image_native`, but `smkClient.ts`'s `mapItem` currently prefers `image_native` (full resolution) even for browse/search listings. Fix: use `image_thumbnail` for search/random listing previews, and only fetch `image_native` for the one painting actually chosen for generation.
- **Cron-first puzzle prep** — the control panel's manual generate/publish flow should become the override, not the primary path. Default operation should be a scheduled job (daily or weekly, configurable) that prepares and publishes the next puzzle automatically. Note: `ensureDailyPuzzleCoverage`/`runDailyPreparation` in `backend/src/server.ts` already implement a startup + 24h-interval coverage check — next step is making the cadence configurable (daily vs. weekly) and moving scheduling off "only runs while the Node process stays up" onto a real OS/hosting-level cron for reliability.
