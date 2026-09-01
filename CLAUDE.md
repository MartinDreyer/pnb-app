# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page "paint by numbers" web app: an SVG painting is divided into numbered regions; the user picks a palette color number, then taps/clicks matching regions to reveal them. When every region is painted, the app fades in the finished reference image.

This is the end-user frontend of a three-repo platform:
- **`pnb-database`** (sibling repo) — Supabase project. Source of truth for which puzzle is "current" and where its assets live.
- **`paintbynumbersgenerator-master/backend`** (sibling repo) — admin control panel that pulls Danish paintings from the SMK API, generates puzzles, and publishes them into `pnb-database`.
- **This repo** — reads whatever puzzle `pnb-database` currently has active and lets the user paint it.

## Running it

`index.html` fetches its config, SVG, and image assets, so it must be served over http(s), not opened as `file://`. From the repo root:

```
python -m http.server 5173
```

then open `http://127.0.0.1:5173/index.html`. It also needs the local Supabase stack from the `pnb-database` repo running (`supabase start` there) with at least one published, currently-active puzzle — see that repo's README for how to publish one via the generator control panel.

There is no build step, package manager, bundler, or test suite — this is plain HTML/CSS/JS with no dependencies (Capacitor's native shells are the exception — see below).

## Data flow

`index.html` no longer ships a hardcoded painting. On load it calls `fetchActivePuzzle()`, which queries `pnb-database`'s `rotation_schedule` table (via Supabase's REST API, anon key) for the row whose `active_from`/`active_until` window contains "now", joined to its `puzzle` and `painting`. It then:
- loads the puzzle's SVG from Supabase Storage (`puzzles` bucket) instead of a local file,
- uses the puzzle's `palette` (jsonb `[{num, rgb:[r,g,b]}, ...]`) instead of a hardcoded array — same shape as before, so `annotateSvg`/`buildSwatches`/etc. are unchanged,
- reveals the puzzle's stored reference image (the original SMK artwork) on completion instead of a local PNG.

Connection config (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) lives in `config.js`, loaded before the main script. The checked-in version points at the local Supabase stack (`pnb-database`'s default local port, `54331`) using its anon key, which is safe to commit — Supabase's RLS policies, not key secrecy, are what protect the data. Point `config.js` at a hosted project's URL/anon key to deploy elsewhere.

If no puzzle is currently active (empty rotation schedule, or a gap between windows), the app throws and shows an error — there's no local fallback painting anymore.

## Legacy files (not part of the current data flow)

- **`pnb.py`** — a standalone Flask server that implements the same paint-by-numbers mechanic against local files (`paintings/palette.png`, `paintings/*.svg`) with its own server-rendered template. Predates the Supabase-backed setup and is not wired to it. Treat as reference/legacy; check with the user before extending it.
- **`paintings/`** — the original local demo assets `pnb.py` and the old hardcoded version of `index.html` used. No longer read by `index.html`.

## Core mechanics

1. Each paintable region is an SVG `<path>` whose original `style="fill: rgb(r,g,b);"` encodes its target color (this is how the generator backend emits puzzles, and how `pnb.py`'s local SVGs are also structured).
2. That fill is mapped to a palette number via an RGB → number lookup built from the palette, then written onto the path as `data-color-num`, and the path's fill is hidden by setting it to white until painted.
3. Clicking a swatch selects a color number; clicking a path only applies the real fill (`data-correct-fill`) if the path's `data-color-num` matches the selected swatch.
4. `index.html` tracks per-color and overall paint progress (`paintedByNum`, `totalToPaint`), moves a swatch to the end of the row with a checkmark once its color is fully completed (rather than hiding it), and reveals the finished reference image (`revealOriginalInWrap`) — plus a dummy painting-trivia panel from `fetchPaintingTrivia()` — when every region is painted. It also has a "cheat" swatch that instantly fills all remaining unpainted regions, a 5-use hint button that pans/zooms to an unpainted region of the selected color, and implements its own touch/mouse pan-zoom plus tap-to-paint (`wireCanvasInteractions`) since it disables native page zoom.

## Translations (i18n)

All UI copy is externalized to `i18n/<lang>.json` (currently `da.json` — the default — and `en.json`), loaded at startup by `loadTranslations()` and applied via `t(key, vars)` (simple `{{var}}` substitution) or, for static markup, `data-i18n`/`data-i18n-aria`/`data-i18n-alt` attributes read by `applyStaticTranslations()`. Language defaults to Danish; override via `window.PNB_CONFIG.LANG` in `config.js`. Add a language by dropping in a new `i18n/<lang>.json` with the same keys as `i18n/da.json`. Dummy painting-trivia content (`fetchPaintingTrivia`'s placeholder period/style/medium/fun-fact) is also translated this way, since it's user-facing text even though it's not real data yet.

## Mobile (Capacitor)

iOS/Android shells are added via Capacitor, wrapping this same static `index.html`/`config.js`/`logo.png` — see the Capacitor section of `README.md` for build commands.

- `capacitor.config.json`'s `webDir` is `www/`, a **generated** folder (gitignored) — `npm run build:www` copies `index.html`/`config.js`/`logo.png`/`i18n/` into it, and `npm run cap:sync` does that plus `cap sync` to push the update into `ios/` and `android/`. Don't edit `www/` directly or add files to it manually; edit the root-level files and re-run the sync script.
- `ios/` and `android/` are real, checked-in native projects (only their own build output — `Pods/`, Gradle caches, etc. — is gitignored), generated once via `npx cap add ios`/`npx cap add android` and kept in sync via `npm run cap:sync`.
- This machine only has Xcode Command Line Tools (no full Xcode.app) and no Android SDK, so `cap sync` (which just copies web assets and doesn't invoke either native toolchain) has been verified to work, but actually building/running the native apps requires Xcode.app + an Apple signing setup, and Android Studio + the Android SDK, respectively — neither is set up here.
