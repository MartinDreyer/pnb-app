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

### 2026-09-14
- Redesigned `pnb-app`'s home menu to match a "weekly games hub" pattern: today's puzzle plus a horizontally scrollable strip of the 8 most recent past weeks (`menuHistoryStrip`), and a new month-browsable Archive overlay (`fetchPuzzleArchive`/`renderArchiveMonth`) for going further back, grouped by month client-side. Also added a livelier, colorful blurred-gradient background behind the menu/archive screens (previously flat white).
- Added a `generator_config` singleton table (`pnb-database` migration `20260914073000_generator_config.sql`) so the generator backend's automated pipeline is admin-configurable instead of hardcoded: enabled toggle, cadence in days (7=weekly, 1=daily, or custom), number of colors, max facets, min facet size, and a new "max regions per color" cap. `rotation_schedule.cadence`'s check constraint widened to allow `'custom'`.
- Implemented the "max regions per color" cap for real: `FacetReducer.capFacetsPerColor` (`src/facetReducer.ts`) merges a color's smallest facets into their nearest neighbour (reusing the existing `deleteFacet` merge mechanism) until that color's region count is at/under the configured cap; wired into `generate.ts` and a new `Settings.maxFacetsPerColor` field. Verified end-to-end against the local Supabase stack + real SMK API: a puzzle generated with `maxRegionsPerColor=40` came out with 37 regions max for any one color.
- `daily.ts`/`server.ts`'s automated pipeline (`runDailyPreparation`/`ensureDailyPuzzleCoverage`) now reads `generator_config` instead of hardcoded `DAILY_SETTINGS`/24h windows (`getNextDailyWindow` → `getNextRotationWindow(cadenceDays)`), skips entirely when disabled, and the coverage-check interval is decoupled from cadence (checks hourly regardless of whether cadence is daily/weekly/custom, so a config change takes effect promptly). Added a "Settings" section to the admin control panel (`backend/public/index.html`/`app.js`) plus new `GET`/`PUT /api/config` endpoints, and a "max regions per color" field to the existing manual Generate panel.
- Fixed a real "no active puzzle" gap the user hit: after a multi-day period with the backend server not running, the rotation schedule had lapsed with nothing covering "now" until the next manual/hourly coverage check. Also fixed the admin control panel's confusing schedule view that the user diagnosed this through — it listed every row ever created oldest-first with `toLocaleString()`'s locale-dependent dot-separated dates (easy to misread as two different dates) and no indication of past/active/upcoming. Added a combined `GET /api/overview` endpoint (`publish.ts`'s new `listPaintings`/`listUnscheduledPuzzles`) and reworked the panel: the rotation schedule is now newest-first with an explicit Past/Active now/Upcoming pill per row (the active one highlighted) and unambiguous `"Mon, 14 Sep 2026, 09:57"`-style dates, plus two new tables — "Paintings pulled from SMK" (used vs. available) and "Prepared but not used" (generated/published puzzles never actually scheduled).

## Next steps

- **Android launcher icons** — `android/app/src/main/res/mipmap-*/ic_launcher*.png` are still the default Capacitor placeholder; only the splash images were refreshed this round.
- **Package for TestFlight** — enroll the dev Apple ID in the paid Apple Developer Program ($99/yr); Personal Team accounts can't generate App Store distribution profiles.
- **History pagination** — `fetchPuzzleHistory()` is capped at the last 52 weekly puzzles with no pagination; revisit once real usage exceeds a year of history.
- **Timer** — track how long a user takes to complete a puzzle, start to finish.
- **Guessing / leaderboard** — let a user guess the painting mid-fill (before it's fully revealed); rank guessers by how early/accurately they guess, to support a leaderboard.
- **Real rotation reliability** — even with the hourly coverage check, gaps ("no active puzzle") can still happen whenever the backend Node process itself isn't running (e.g. the dev laptop is off/asleep). The lasting fix is the "Cron-first puzzle prep" item below, not a shorter poll interval.
- **Lighter-weight SMK browsing** — the control panel feels heavy when listing multiple candidate paintings. SMK's search API already returns an `image_thumbnail` field alongside `image_native`, but `smkClient.ts`'s `mapItem` currently prefers `image_native` (full resolution) even for browse/search listings. Fix: use `image_thumbnail` for search/random listing previews, and only fetch `image_native` for the one painting actually chosen for generation.
- **Cron-first puzzle prep** — the control panel's manual generate/publish flow should become the override, not the primary path. Default operation should be a scheduled job (daily or weekly, configurable) that prepares and publishes the next puzzle automatically. Note: `ensureDailyPuzzleCoverage`/`runDailyPreparation` in `backend/src/server.ts` already implement a startup + 24h-interval coverage check — next step is making the cadence configurable (daily vs. weekly) and moving scheduling off "only runs while the Node process stays up" onto a real OS/hosting-level cron for reliability.
