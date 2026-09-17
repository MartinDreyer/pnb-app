# iPad production-readiness checklist

A manual pass to run through before shipping a build to real users (TestFlight
or App Store). Not automated — check items off by hand on a real iPad (a
simulator is fine for layout, but do the final pass on physical hardware at
least once, since several past bugs only showed up there — see the "known
regression risks" notes below).

Re-run this whenever `index.html`/`config.js`/CSS changes materially, and
always before a release build.

## 0. Build & config

- [ ] `config.js`'s `SUPABASE_URL`/`SUPABASE_ANON_KEY` point at the real
      hosted Supabase project, not `127.0.0.1`/local (unreachable off your
      dev machine's network)
- [ ] `config.js`'s `ENV` is set to `'production'` (real error popup, no
      leaked technical detail/URLs on failure)
- [ ] `npm run cap:sync` has been run since the last `index.html`/`config.js`/
      `logo.png`/`i18n/` change (`www/`, `ios/`, `android/` are up to date)
- [ ] App version/build number bumped in Xcode before archiving
- [ ] A hosted puzzle is actually active right now (check
      `rotation_schedule` covers "now") — otherwise every install shows the
      no-active-puzzle error
- [ ] On a device that has never run a build signed by this Apple ID before,
      the very first launch attempt shows iOS's "Untrusted Developer" alert.
      This is expected with free Apple ID/Personal Team signing (see
      `CLAUDE.md`'s Capacitor section) — trust it once via Settings → General
      → VPN & Device Management → the developer profile → Trust, before
      testing anything else. Not a bug; don't spend time debugging it.

## 1. Cold launch

- [x] Fresh install (delete any existing copy first) launches to the native
      splash, then the animated splash, then either the home menu or a
      puzzle — no flash of blank white screen at any point
- [x] The very first launch after install (or after just trusting the
      developer certificate) may show a black screen for a couple of
      seconds before the splash appears — this is iOS validating the fresh
      binary's code signature before the process can even start, happens
      before any of our code runs, and is expected/unavoidable. Confirmed
      2026-09-17: ~3s black on first launch, <1s on every relaunch after
      that — that gap between first-launch and relaunch timing is the
      normal signature, not a regression
- [ ] Force-quit and relaunch (not a fresh install): the black-screen gap
      before the splash should be brief, well under a second — if this
      creeps up on a *relaunch* (not first launch), that's the one worth
      investigating, since it's no longer explained by first-run code-signing
      overhead
- [ ] Airplane mode / no network on cold launch shows the translated
      production error popup with an error code, not a raw error message
- [ ] Relaunching a second time (same session vs. new session — force-quit
      and reopen) does **not** replay the full animated splash on in-app
      menu↔puzzle navigation, but **does** replay it on an actual cold
      relaunch

## 2. Orientation & layout (known regression risk — see notes)

- [x] Launch in portrait, rotate to landscape, rotate back: canvas fills the
      full screen at every step, no stale narrow/short viewport
- [x] Navigate menu → puzzle → menu (back button) in both orientations: no
      stuck narrow width after the reload-based navigation
- [x] Rotate mid-puzzle while partially painted: progress is preserved,
      canvas re-fits to the new orientation
- [x] Home menu's recent-history strip wraps into a multi-row grid (not a
      single horizontally-scrolling band) at iPad width, in both orientations
- [x] Palette swatch row height looks correct in both orientations (not
      clipped, not oversized) on first paint after cold launch — this
      previously broke silently until a rotation "fixed" it
- [ ] Test on at least two iPad sizes if available (e.g. iPad mini and iPad
      Pro 11"/12.9") — layouts that fit one may not fit the other (Not currently possible to test)

## 3. Core painting mechanics

- [x] Tapping a swatch selects it (visual selected state is clear)
- [x] Tapping a region with the wrong color selected does nothing
- [x] Tapping a region with the correct color selected paints it, updates
      that color's remaining count, and updates the number label visibility
- [x] A swatch moves to the end of the row with a checkmark once its color
      is fully painted
- [x] Pinch-to-zoom and one/two-finger pan work smoothly on the canvas
- [x] Native page zoom/scroll is disabled — the canvas doesn't fight the
      OS's own pinch-zoom or bounce-scroll
- [x] Hint button (5 uses) pans/zooms to an unpainted region of the
      selected color, and the remaining-uses count decrements correctly,
      disabling itself at zero
- [x] Cheat swatch fills all-but-one remaining region and never completes
      the puzzle by itself
- [x] Painting the very last region completes the puzzle: reference image
      fades in, and the trivia panel appears
- [x] Force-quit mid-puzzle and reopen: previously painted regions are
      restored correctly (per-puzzle progress persistence)
- [x] Reopening an already-completed puzzle from history shows it already
      finished/revealed, not paintable again

## 4. Navigation & history

- [x] Home menu → puzzle → home button → back at menu, state intact
- [ ] Recent-history strip entries open the correct past puzzle
- [x] Archive (if applicable) opens and its entries open the correct puzzle

## 5. Language / i18n

- [ ] Default language (Danish) renders correctly with no missing-key
      placeholders or literal `{{var}}` left unsubstituted anywhere in the UI
- [ ] Switch `config.js`'s `LANG` to `en`, re-sync, and repeat a spot-check
      of the above — especially the production error popup and trivia panel
      text, which were added most recently and are easiest to miss a key for
- [ ] No text overflow/clipping in either language at iPad widths (Danish
      strings tend to run longer than English)

## 6. Failure & edge cases

- [ ] No active puzzle (empty rotation schedule) shows a clear, translated
      error, not a blank screen or raw stack trace
- [ ] Network drops mid-load (toggle airplane mode while loading) is
      handled without a crash or an infinite spinner
- [ ] Backgrounding the app mid-puzzle and returning later doesn't lose
      progress or corrupt state
- [ ] Low storage / low memory: backgrounding several other heavy apps
      first, then returning to this one, doesn't cause a silent reset

## 7. Accessibility & polish

- [ ] VoiceOver can at minimum read swatch labels and the hint/cheat/home
      buttons meaningfully (not just "button")
- [ ] Text scales reasonably with the system's Dynamic Type setting turned
      up, without breaking layout
- [ ] Tap targets (swatches, buttons) are comfortably sized for touch, not
      just mouse-sized
- [ ] App icon and launch splash are the real branded assets, not the
      default Capacitor placeholder

## 8. Performance

- [ ] Run the benchmark in `PERFORMANCE.md` on the target device and record
      a baseline in `perf/BENCHMARKS.csv` before release
- [ ] Pan/zoom feels smooth (no visible stutter) on a detailed puzzle with
      many regions
- [ ] Cold launch time to a paintable puzzle feels acceptable on the
      oldest/slowest iPad you have available to test

## 9. Store readiness (once functional checks above pass)

- [ ] Privacy policy / data-use disclosure matches what the app actually
      does (Supabase queries, no accounts/tracking beyond that, etc.)
- [ ] App Store screenshots reflect the current UI, not an older layout
- [ ] Paid Apple Developer Program enrollment is in place (needed for
      TestFlight/App Store distribution — see `CLAUDE.md`'s Capacitor
      section for current status)

---

### Known regression risks worth re-checking every time

These have broken before in ways that only showed up on real iPad hardware
after a specific navigation/rotation sequence — see `ROADMAP.md`'s "Done"
entries for the full incident writeups:
- `.app`'s width/height sticking at a stale, too-narrow/short value after a
  reload-based menu↔puzzle navigation, only self-correcting on rotation
- `--palette-h` using plain `vh` and rendering wrong until something forced
  a relayout
- The home menu's history strip staying a single scrolling row instead of
  wrapping into a grid on tablet-sized screens
