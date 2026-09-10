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

## Next up

- [ ] Refresh Android's `mipmap-*/ic_launcher*.png` launcher icons (still the default Capacitor placeholder)
- [ ] Enroll in the paid Apple Developer Program so the app can actually be uploaded to TestFlight
- [ ] Paginate/cap puzzle history beyond the current hardcoded 52-week limit
- [ ] Add a completion timer (start on first paint, stop when the puzzle is finished)
- [ ] Add a mid-fill "guess the painting" option
- [ ] Build a leaderboard ranking guesses by how early/correct they were
- [ ] Switch control-panel SMK browsing (search/random candidate lists) to `image_thumbnail` instead of `image_native`; keep `image_native` only for the painting actually chosen for generation
- [ ] Make the daily puzzle-prep cadence configurable (daily vs. weekly)
- [ ] Move puzzle-prep scheduling off the Node process's `setInterval` onto a real cron/scheduler, so it runs reliably regardless of whether the control panel server is up
