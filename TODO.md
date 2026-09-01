# TODO

Actionable checklist. See `ROADMAP.md` for the narrative version.

To keep merges clean: check items off in place (don't reflow/reorder the list), and add
new items to the end of the relevant section rather than inserting mid-list.

## Done (2026-09-01)

- [x] Restrict SMK pulls to Danish artists (`creator_nationality:Danish` filter in `smkClient.ts`)
- [x] Generate + publish new puzzles via the control panel to verify the pipeline end-to-end
- [x] Replace dummy completion-panel trivia with a real SMK API lookup (year/period/style/medium/fun fact)

## Next up

- [ ] Add a completion timer (start on first paint, stop when the puzzle is finished)
- [ ] Add a mid-fill "guess the painting" option
- [ ] Build a leaderboard ranking guesses by how early/correct they were
- [ ] Switch control-panel SMK browsing (search/random candidate lists) to `image_thumbnail` instead of `image_native`; keep `image_native` only for the painting actually chosen for generation
- [ ] Make the daily puzzle-prep cadence configurable (daily vs. weekly)
- [ ] Move puzzle-prep scheduling off the Node process's `setInterval` onto a real cron/scheduler, so it runs reliably regardless of whether the control panel server is up
