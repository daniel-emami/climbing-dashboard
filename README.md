# Climbing Dashboard

Excel-backed FastAPI and React dashboard for outdoor boulders you have climbed.

The workbook `data/Boulders_Ticklist.xlsx` is the source of truth. The backend reads the first seven columns of the first worksheet and appends new climbs to the same sheet. The frontend lets you add climbs and explore grade, area, flash, and area-by-grade summaries.

## Project Shape

```text
backend/ClimbingDashboard/Api        FastAPI app, router, API service
backend/ClimbingDashboard/Storage    Excel read/write layer
backend/ClimbingDashboard/Models     Boulder domain model
backend/ClimbingDashboard/Utilities  Date conversion helpers
frontend/src                         Vite React dashboard
```

## Run Locally

Install backend dependencies:

```bash
uv sync
```

Start the API:

```bash
uv run uvicorn ClimbingDashboard.Api.api_app:app --reload --app-dir backend
```

In another terminal, install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Share From Your Computer

For a public tunnel such as ngrok or Cloudflare Tunnel, run the backend from the
project root:

```bash
uv run uvicorn ClimbingDashboard.Api.api_app:app --reload --app-dir backend --host 0.0.0.0 --port 8000
```

Then run the frontend from the `frontend/` folder:

```bash
cd frontend
npm run dev
```

In a third terminal, expose the frontend:

```bash
ngrok http 5173
```

Send the public ngrok frontend URL to your friend. The Vite dev server proxies
`/api` requests to the backend, so only one public tunnel is needed.

## Run With Docker

Install Docker Desktop, then run this from the project root:

```bash
docker compose up --build
```

Open `http://localhost:5173`.

The backend runs at `http://localhost:8000`. The `data/` folder is mounted into the
backend container, so edits made in the app are saved to your local
`data/Boulders_Ticklist.xlsx` file.

To stop the app, press `Ctrl+C` in the terminal running Docker Compose.

## API

- `GET /health` checks that the backend is running.
- `GET /api/boulders` returns workbook rows plus dashboard statistics.
- `POST /api/boulders` appends a climbed boulder to `Boulders_Ticklist.xlsx`.
- `PUT /api/boulders` updates a boulder matched by its original name and area.
- `DELETE /api/boulders` removes a boulder matched by name and area.
- `POST /api/imports/thetopo/preview` previews public TheTopo boulders for a username.
- `POST /api/imports/thetopo/confirm` saves selected preview boulders to the workbook.

## Workbook Columns

The backend currently expects these headers in row 1 of `data/Boulders_Ticklist.xlsx`:

```text
Navn | 27Crags grade | Guide grade | My grade | Område | Flash | Dato
```

Normal formulas and workbook content are preserved when new rows are appended. `openpyxl` may remove unsupported Excel-only extensions if the workbook uses them, so keep a backup before heavy editing.
