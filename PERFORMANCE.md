# Performance benchmarking

A simple, manual way to measure how fast the app boots into a paintable
puzzle, and to track that number over time as the app changes.

## What it measures

`index.html` marks five points during a cold boot into a puzzle (see
`pnbMark`/`reportPerf` near `boot()`), using the browser's `Performance` API:

| Stage | What it covers |
|---|---|
| `i18n_ms` | Fetching + parsing `i18n/<lang>.json` |
| `puzzle_fetch_ms` | Querying Supabase for the active puzzle (`fetchActivePuzzle`/`fetchPuzzleById`) |
| `svg_load_ms` | Downloading the puzzle's SVG from Supabase Storage |
| `svg_annotate_ms` | `annotateSvg` — mapping every region's fill to a palette number |
| `time_to_interactive_ms` | Total: boot start → pan/zoom + tap-to-paint wired up and ready |

These cover the parts of boot that scale with network conditions, puzzle
size, and device CPU — the things most likely to regress as puzzles get
more detailed or a device gets older/more loaded down.

## Running it

1. Load the app with `?perf=1` appended to the puzzle URL, e.g.:
   `http://127.0.0.1:5173/index.html?perf=1#p/today`
   (or, in the installed iPad/iPhone app, add `?perf=1` to the puzzle
   navigation before building — e.g. temporarily hardcode it in
   `goToPuzzle`/`location.hash` handling — or connect Safari's Develop menu
   to the device's WebView and run `location.search = '?perf=1'` in its
   console, then reload.)
2. Wait for the puzzle to finish loading. A small black overlay appears in
   the bottom-left corner with the timings, and the same numbers are logged
   to the console as one ready-to-paste CSV row.
3. Fill in the `DEVICE`/`BROWSER`/`NOTES` placeholders in that row (e.g.
   `iPad Pro 11" 2022,Safari 18,cold local Supabase`) and append it as a new
   line to `perf/BENCHMARKS.csv`.
4. Commit the updated CSV alongside whatever change prompted the run, so the
   history in git shows performance over time next to the commits that
   caused it.

Without `?perf=1`, none of this shows up — the marks are always recorded
(they're effectively free) but never read or displayed, so there's no
production behavior change.

## Reading the log

`perf/BENCHMARKS.csv` is plain CSV, oldest first. Open it in a spreadsheet
tool (or `column -s, -t perf/BENCHMARKS.csv` in a terminal) to eyeball
trends per device, or diff it in a PR to see how a change moved the
numbers. There's no dashboard or automated threshold — this is a manual
log, checked by eye when it matters (before a release, after a puzzle
generator change, when a device feels slower than it used to).

## Notes on comparing runs

- Run on the same puzzle (or note which one) — larger/more detailed SVGs
  will naturally have higher `svg_load_ms`/`svg_annotate_ms`.
- Run a few times and take the typical value — the first load after
  installing/reinstalling the app is slower (cold caches).
- Network conditions matter for `puzzle_fetch_ms`/`svg_load_ms` — note in
  the CSV row whether you were against local Supabase vs. a hosted project,
  and on wifi vs. cellular.
