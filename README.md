# Climbing Dashboard

SQLite-backed FastAPI and React dashboard for outdoor boulders you have climbed.

The SQLite database `data/climbing_dashboard.db` is the source of truth. The frontend lets you add climbs and explore grade, area, flash, climber, and area-by-grade summaries.

## Project Shape

```text
backend/ClimbingDashboard/Api        FastAPI app, router, API service
backend/ClimbingDashboard/Storage    SQLite storage and Excel import/export helpers
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
`data/climbing_dashboard.db` file.

To stop the app, press `Ctrl+C` in the terminal running Docker Compose.

## API

- `GET /health` checks that the backend is running.
- `GET /api/boulders` returns stored rows plus dashboard statistics.
- `POST /api/boulders` appends a climbed boulder to the SQLite database.
- `PUT /api/boulders` updates a boulder matched by its original name, area, and climber.
- `DELETE /api/boulders` removes a boulder matched by name, area, and climber.
- `GET /api/boulders/comments` returns public comments for one boulder problem.
- `POST /api/boulders/comments` appends a public comment to one boulder problem.
- `PUT /api/boulders/comments/{comment_id}` updates a public boulder comment.
- `DELETE /api/boulders/comments/{comment_id}` soft-deletes a public boulder comment.
- `POST /api/imports/thetopo/preview` previews public TheTopo boulders for a username.
- `POST /api/imports/thetopo/confirm` saves selected preview boulders to the database.
- `POST /api/exports/boulders` exports supplied boulder rows to an Excel workbook.

## Data Files

The app writes current data to:

```text
data/climbing_dashboard.db
```

Inside SQLite, the data is normalized:

```text
boulder_problems   One row per boulder name and area
ascents            One row per climber ascent/tick of a boulder
boulder_comments   Public boulder comment thread data
```

Excel exports use this workbook shape:

```text
Navn | 27Crags grade | Guide grade | Own grade | Område | Flash | Dato | Climber | Rating
```

A boulder problem is unique by `Navn` and `Område`. An ascent is unique by that
boulder problem plus `Climber`, so several climbers can log the same boulder
without being treated as duplicates. Filtered frontend data can be exported back
to an `.xlsx` file with the `Export visible` button.
