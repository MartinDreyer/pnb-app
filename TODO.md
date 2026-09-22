# TODO

Actionable checklist. See `ROADMAP.md` for the narrative version.

To keep merges clean: check items off in place (don't reflow/reorder the list), and add
new items to the end of the relevant section rather than inserting mid-list.

## Done (2026-09-01)

- [x] Restrict SMK pulls to Danish artists (`creator_nationality:Danish` filter in `smkClient.ts`)
- [x] Generate + publish new puzzles via the control panel to verify the pipeline end-to-end
- [x] Replace dummy completion-panel trivia with a real SMK API lookup (year/period/style/medium/fun fact)

## Done (2026-09-08)

- [x] Remove the topbar logo image and its unused i18n/CSS
- [x] Fix top/side safe-area clipping on notch/Dynamic Island devices
- [x] Set up Xcode + CocoaPods and run the app on a physical iPhone (free Apple ID)
- [x] Add a home/menu screen with a "Today's puzzle" card and past-weeks history list
- [x] Persist per-puzzle painting progress locally so navigating away doesn't lose work

## Done (2026-09-10)

- [x] Replace the default Capacitor icon/splash placeholder with a custom app icon and splash screen (iOS + Android assets)
- [x] Add `@capacitor/splash-screen` and keep the native splash up until the app's own data finishes loading

## Done (2026-09-14)

- [x] Redesign the home menu's history into a horizontal "past weeks" strip + a month-browsable Archive overlay, instead of one flat capped list
- [x] Add a livelier, more colorful background to the menu/archive screens
- [x] Add an admin-configurable `generator_config` (cadence in days, enabled toggle, color/facet/region tuning) instead of hardcoded pipeline settings
- [x] Implement a real "max regions per color" cap in the generator (`FacetReducer.capFacetsPerColor`), verified end-to-end against a live SMK-generated puzzle
- [x] Make the puzzle-prep cadence configurable (any day interval, not just a fixed daily/weekly split) via the new Settings panel
- [x] Fix the confusing admin schedule table (ambiguous dates, no past/active/upcoming indication) and add "Paintings" (used/available) and "Prepared but not used" overview tables

## Done (2026-09-15)

- [x] Show a plain short date ("14. sep") instead of "Week of .../Uge ..." on the menu/archive history cards
- [x] Clear all existing paintings/puzzles/rotation-schedule data (DB rows + storage objects) and generate 5 fresh weekly puzzles
- [x] Fix the painting canvas rendering undersized on cold launch (fixed itself on rotate) by switching `--palette-h` from plain `vh` to `dvh`, same fix already applied to `.app`'s height
- [x] Replace the "14. sep"-style date on history/archive cards with a stable release-order number ("#1", "#2", ...) and add "a new painting is added every week" info copy in its place
- [x] Replace the Archive's month-by-month browsing with one flat numbered grid
- [x] Grow the prepared puzzle backlog from 5 to 20 via the generator backend
- [x] Make the cheat swatch always leave one region unpainted instead of finishing the puzzle
- [x] Remove the trivia panel's guess-the-title/artist mini-game; show title/artist directly on completion
- [x] Reword the "no active puzzle" error so it doesn't reference the admin control panel (real end users never see it)
- [x] Backdate the 20-puzzle backlog so #1-19 are usable now as history/archive baseline and #20 is today's puzzle, with the weekly schedule continuing from #21
- [x] Make the menu's history strip wrap into several rows on iPad-sized screens instead of a single horizontally-scrolling band
- [x] Fix `.app` rendering at a stale, too-narrow width in portrait mode after a menu-to-puzzle navigation (gave `width` the same `--app-vw`/`100dvw` treatment `height` already had)
- [x] Add an optional AI-researched (web search) blurb about each painting/painter, shown on completion with an AI-disclaimer; wired into puzzle generation so it runs once per new painting
- [x] Add the missing `paintings.used_at` migration (schema-drift gap found while adding the above)

## Next up

- [ ] Fix `runDailyPreparation`/`/api/generate` crashing (`StorageApiError`, 413) when a chosen SMK painting's `image_native` exceeds the `puzzles` bucket's 50MiB limit (hit a real 413MB download on 2026-09-15) — either downscale the reference image before upload, raise the bucket limit, or skip oversized artworks up front
- [ ] Set `ANTHROPIC_API_KEY` in `paintbynumbersgenerator-master/backend/.env` to actually activate the AI painting-blurb enrichment (wired in but inactive without it — see `src/enrichment.ts`)
- [ ] Backfill `ai_summary` for the current 20 prepared puzzles once a key is set — they were generated before the enrichment wiring landed, so none have a blurb yet; only #21 onward will pick it up automatically

- [ ] Refresh Android's `mipmap-*/ic_launcher*.png` launcher icons (still the default Capacitor placeholder)
- [ ] Enroll in the paid Apple Developer Program so the app can actually be uploaded to TestFlight
- [ ] Add a completion timer (start on first paint, stop when the puzzle is finished)
- [ ] Switch control-panel SMK browsing (search/random candidate lists) to `image_thumbnail` instead of `image_native`; keep `image_native` only for the painting actually chosen for generation
- [ ] Move puzzle-prep scheduling off the Node process's `setInterval` onto a real cron/scheduler, so it runs reliably regardless of whether the control panel server is up

## Done (2026-09-17)

- [x] Add a `pnb-app` develop/production mode toggle (`window.PNB_CONFIG.ENV` in `config.js`) so production shows a translated, detail-free "something went wrong" popup with an error code instead of the technical debug banner/raw error message
- [x] Write `IPAD_QA_CHECKLIST.md`, a manual iPad production-readiness checklist
- [x] Add opt-in (`?perf=1`) boot performance instrumentation to `index.html` plus `PERFORMANCE.md`/`perf/BENCHMARKS.csv` for tracking benchmark runs over time
- [x] Update the cheat swatch's label to "Udfyld (næsten) alt" and adjust its CSS so the longer text fits
- [x] Show the puzzle's serial number in the topbar (e.g. "Maleri #4") so reopening an old puzzle from the menu/Archive makes clear which one is open
- [x] Remove the stale "guess the painting" wording from the topbar hint text; remove the two outdated guessing-related backlog ideas

## Done (2026-09-22)

- [x] Integrate `@capacitor-community/admob`: native banner ad + layout reserved for it (`--banner-h`), rewarded ad to grant extra hints once the free limit is used up
- [x] Drop the free hint limit from 5 to 3, now that rewarded-ad top-ups exist; add a "watch an ad" affordance in place of just disabling the hint button
- [x] Avoid burning a hint/ad view when re-tapping the hint button on a still-unpainted region it already pointed to
