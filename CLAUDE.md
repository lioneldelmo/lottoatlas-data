# lottoatlas-data

Scheduled collector that fetches lottery results and publishes static JSON for the LottoAtlas app.
Runs in GitHub Actions every 15 minutes; output in `data/v1` is deployed to GitHub Pages.

## Commands

```bash
npm run collect      # normal run: only games whose latest scheduled draw is missing
npm run backfill     # refetch the current year for every game
npm run typecheck
npm test
npm run serve        # serve ./data on :8787 for the app
```

Node 24 runs the TypeScript directly. Imports need the `.ts` extension; use only erasable TS syntax
(no enums, namespaces or parameter properties). `typecheck` and `test` must pass before any task is done.

## Layout

- `src/schema/index.ts` — the data contract. Source of truth for the app too; keep it zod-only.
- `src/games/index.ts` — game catalogue (matrix, schedule, time zone, colours).
- `src/sources/` — one adapter per upstream source. Parsing is a pure function tested against fixtures.
- `src/core/` — time-zone maths, validation, file writing.
- `src/run.ts` — entry point.
- `data/v1/` — generated. Never edit by hand.

## Rules

- Wrong numbers are the worst possible bug. Every draw passes `validateDraw` before it is written.
  When in doubt, publish nothing and fail the run.
- A published draw's numbers are never changed automatically; a conflict fails the run for a human to look at.
- One game failing must not block the others.
- Runs are idempotent: an unchanged result produces no file change and no commit.
- Changing a shape in `src/schema` is a breaking change for shipped apps. Additive optional fields are fine;
  anything else needs a new `data/v2` directory and a `SCHEMA_VERSION` bump.
- Adding a game: catalogue entry + adapter (or reuse one) + a fixture copied from the real source + a test.
  Take the matrix and schedule from the operator's published rules.
- Prefer official open-data or JSON endpoints over HTML scraping. Check the source's terms and `robots.txt`.
  Keep request volume minimal — the scheduler only fetches games that are due.
- No operator logos or artwork in this repo.
