# lottoatlas-data

Collects lottery results on a schedule and publishes them as static JSON for the LottoAtlas app.

```bash
npm install
npm run collect          # fetch games whose latest scheduled draw is missing
npm run collect:force    # fetch every game
npm run backfill         # fetch every game from 1 January of this year
npm run serve            # serve ./data at http://localhost:8787 for app development
npm run typecheck
npm test
```

Requires Node 24.3+ (TypeScript runs directly, no build step).

## Published files

```
data/v1/manifest.json                      latest draw id per game — the app polls this
data/v1/games.json                         game catalogue
data/v1/games/<gameId>/latest.json         most recent draw + next draw time
data/v1/games/<gameId>/history/<year>.json all draws in a year, newest first
```

Shapes are defined in `src/schema/index.ts`.

## One-time GitHub setup

1. Create a **public** repository and push this folder to `main`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Settings → Actions → General → Workflow permissions: **Read and write**.
4. Run the "Collect results" workflow once from the Actions tab.

Data is then served at `https://<owner>.github.io/<repo>/v1/…`.

## Sources

| Game | Source |
|---|---|
| Powerball, Mega Millions | New York State Gaming Commission open data (data.ny.gov). Numbers only, no jackpots. |

Unofficial. Not affiliated with any lottery operator.
