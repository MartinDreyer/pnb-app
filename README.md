# Paint by Numbers

A browser-based "paint by numbers" app. A painting is divided into numbered regions; you pick a color number from the palette, then tap or click the matching regions to fill them in. Once every region is painted, the original artwork fades in as the finished result.

Puzzles come from a companion generator that pulls Danish paintings from the [SMK open API](https://api.smk.dk) — the app itself always shows whichever puzzle is currently active, no picking required.

## Running it

`index.html` loads its assets with `fetch()`, so it needs to be served over http(s) — opening it directly as a `file://` URL will not work. It also needs a running Supabase backend with a currently-active published puzzle (see `pnb-database`'s README for local setup, and `paintbynumbersgenerator-master/backend` for the control panel that publishes puzzles).

From the repo root, start a simple local server:

```
python -m http.server 5173
```

Then open:

```
http://127.0.0.1:5173/index.html
```

`config.js` points the app at Supabase; the checked-in version targets the local dev stack.

## How to use it

1. **Today's puzzle loads automatically** — the title/artist show in the top bar.
2. **Pick a color** — the palette strip at the bottom of the screen shows numbered color swatches. Tap a swatch to select it; the selected swatch is highlighted and shown in the "Selected" label.
3. **Paint a region** — tap or click a region in the painting. If its number matches the selected swatch, it fills in with that color. If it doesn't match, nothing happens — pick the correct number and try again.
4. **Track progress** — each swatch shows a `painted/total` counter for that color. A swatch disappears from the palette once all of its regions are filled.
5. **Zoom and pan** — pinch to zoom (touch) or scroll/drag with the mouse (desktop) to get into tight spots.
6. **Finish** — once every region is painted, the palette hides and the full-color original painting fades in.
7. **Cheat** — the last swatch in the palette, labeled `CHEAT`, instantly fills in all remaining unpainted regions with their correct colors, useful for previewing or skipping ahead.

## Adding a painting

New puzzles aren't added here — generate and publish them from the control panel in `paintbynumbersgenerator-master/backend`, which writes them into `pnb-database`. This app just displays whatever's currently active in the rotation schedule.

## Mobile app (iOS/Android)

This same app is packaged for iOS/Android via [Capacitor](https://capacitorjs.com) — the native shells load the exact same `index.html`/`config.js`, no separate mobile codebase.

```
npm install         # installs @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android
npm run cap:sync    # copies index.html/config.js/logo.png into www/, then `cap sync` into ios/ and android/
```

`npm run cap:sync` needs to be re-run any time `index.html`/`config.js`/`logo.png` change, so the native projects (`ios/`, `android/`) pick up the update — `www/` is a generated build folder (gitignored), not something to edit directly.

From there:
- **iOS**: `npx cap open ios` opens the Xcode project in `ios/`, then build/run from Xcode. Needs the full Xcode.app (not just Command Line Tools) and a valid Apple signing setup.
- **Android**: `npx cap open android` opens the project in `android/` in Android Studio, then build/run from there. Needs the Android SDK (via Android Studio).

Point `config.js`'s `SUPABASE_URL`/`SUPABASE_ANON_KEY` at a real hosted Supabase project before shipping — the checked-in values target `127.0.0.1`, which isn't reachable from a device/simulator on a different network than your dev machine.
