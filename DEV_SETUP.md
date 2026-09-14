# Dev environment setup

How to get all three repos of the paint-by-numbers platform running locally, end to end:

- **`pnb-database`** — Supabase project (schema, storage, RLS). Source of truth for
  which puzzle is "current".
- **`paintbynumbersgenerator-master/backend`** — admin control panel. Pulls Danish
  paintings from the SMK API, generates puzzles, publishes them into `pnb-database`.
- **`pnb-app`** (this repo) — end-user app. Reads whatever puzzle is currently active
  and lets the user paint it.

Data flows one way: `backend` (writes, via `service_role`) → `pnb-database` → `pnb-app`
(reads, via `anon`). To see a puzzle in the app, the backend must generate and publish
one first.

Repos are assumed to be sibling directories:

```
work/
├── pnb-app/
├── pnb-database/
└── paintbynumbersgenerator-master/
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the local
  Supabase stack)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  — `brew install supabase/tap/supabase`
- Node.js + npm (for the backend and, optionally, `pnb-app`'s Capacitor tooling)
- Python 3 (just for `python -m http.server`, to serve `pnb-app` statically)

## 1. Start Supabase (`pnb-database`)

```
cd pnb-database
supabase start    # boots the local stack (first run pulls Docker images, can take a while)
supabase status    # prints URLs + anon/service_role keys — keep this handy
```

This project's `supabase/config.toml` offsets the default ports (another local Supabase
project already uses `54321`-`54329` on this machine):

| Service          | Port    |
|------------------|---------|
| API (Kong)       | `54331` |
| Postgres         | `54332` |
| Studio           | `54333` |
| Inbucket/Mailpit | `54334` |
| Analytics        | `54337` |
| DB pooler        | `54339` |
| DB shadow (diff) | `54330` |

Studio (browse tables/storage in a UI): http://127.0.0.1:54333

`supabase db reset` drops and recreates the local DB, replaying `supabase/migrations/`
(seed data is currently empty — real rows come from the generator backend, not fixtures).

Run `supabase stop` when done.

## 2. Start the generator backend (`paintbynumbersgenerator-master/backend`)

```
cd paintbynumbersgenerator-master/backend
cp .env.example .env   # first time only
npm install
```

Fill in `.env` from the `supabase status` output in step 1:

```
SUPABASE_URL=http://127.0.0.1:54331
SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`>
SMK_API_BASE_URL=https://api.smk.dk/api/v1   # optional, this is the default
PORT=4000
```

Then:

```
npm run dev   # tsc build + start; control panel at http://127.0.0.1:4000
```

In the control panel: search or pick a random SMK painting, generate a puzzle, review
it, then publish and schedule it. Publishing is what makes `pnb-app` able to show it —
until a puzzle is published and its rotation window includes "now", the app has nothing
to load.

Note: `canvas`'s native module needs Homebrew's `cairo`/`pango`/`pixman` etc. present on
the machine — see `paintbynumbersgenerator-master/CLAUDE.md` if `npm install` fails on it.

## 3. Start the app (`pnb-app`)

```
cd pnb-app
python -m http.server 5173
```

Then open http://127.0.0.1:5173/index.html.

`config.js` (checked in) already points at the local Supabase stack from step 1. It's
set to the dev machine's LAN IP rather than `127.0.0.1` so phones/tablets on the same
Wi-Fi can load it too — if the app can't reach Supabase, check whether that IP is still
current (`ipconfig getifaddr en0` on macOS) and update `SUPABASE_URL` in `config.js` if
the machine has changed networks. The `SUPABASE_ANON_KEY` in `config.js` should match
the anon key from `supabase status` — it won't if `pnb-database` was reset with `supabase
db reset --no-seed` or the project was recreated.

`index.html` fetches its config/SVG/images, so it must be served over http(s), not
opened as `file://`.

If the app throws an error on load, it almost always means there's no currently-active
row in `rotation_schedule` — go back to step 2 and publish/schedule a puzzle.

## Everyday loop

Once all three are set up once, day-to-day it's just:

```
cd pnb-database && supabase start
cd paintbynumbersgenerator-master/backend && npm run dev
cd pnb-app && python -m http.server 5173
```

in three terminals (or tabs), in that order.

## Optional: mobile shells (iOS/Android)

`pnb-app` also ships as an iOS/Android app via Capacitor, wrapping the same
`index.html`/`config.js`. Not needed for regular web dev — see the "Mobile app"
section of `pnb-app/README.md` for `npm run cap:sync` and opening the native projects.
Point `config.js` at a real hosted Supabase project (not `127.0.0.1`/a LAN IP) before
building for a device that isn't on the same network as the dev machine.

## Troubleshooting

- **`supabase start` fails / hangs** — make sure Docker Desktop is actually running first.
- **Port already in use** — another Supabase project on this machine may be running on
  the same ports; check `supabase/config.toml` in both repos and `docker ps`.
- **Backend `npm install` fails on `canvas`** — needs Homebrew's `cairo`/`pango`/`pixman`
  native libs; see `paintbynumbersgenerator-master/CLAUDE.md` for the specifics that were
  needed on this machine.
- **App loads but shows an error / blank** — no published puzzle currently in its
  rotation window; publish one from the control panel (step 2).
- **App can't reach Supabase from a phone** — `config.js`'s `SUPABASE_URL` uses a LAN IP
  that goes stale when the dev machine changes networks; update it.
