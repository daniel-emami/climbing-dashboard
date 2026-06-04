# Code Flow Guide

This is the quick mental model for the app.

## 1. The Excel File Is the Database

`data/Boulders_Ticklist.xlsx` stays as the source of truth. The backend reads the first worksheet and only uses columns `A:G`:

```text
Navn, 27Crags grade, Guide grade, Min grade, Område, Flash, Dato
```

The storage code lives in:

```text
backend/ClimbingDashboard/Storage/excel_storage.py
```

That file validates the headers, reads each row into a `BoulderRecord`, and appends new boulders to the next empty row.

## 2. The Backend Turns Rows Into Dashboard Data

The main backend flow is:

```text
FastAPI route -> ApiService -> ExcelStorage -> BoulderRecord -> response payload
```

The key files are:

```text
backend/ClimbingDashboard/Api/api_app.py
backend/ClimbingDashboard/Api/api_router.py
backend/ClimbingDashboard/Api/api_service.py
backend/ClimbingDashboard/Models/boulder_record.py
```

`api_router.py` defines the URLs:

- `GET /api/boulders`
- `POST /api/boulders`

`api_service.py` does the calculations for the frontend:

- total climbed boulders
- flash count and flash rate
- counts by area
- grade counts for `27Crags`, `Guide`, and `Min`
- an area-by-min-grade matrix

## 3. The Frontend Loads and Displays the Payload

The frontend starts in:

```text
frontend/src/App.tsx
```

On load, it calls:

```text
frontend/src/Api/boulderApi.ts
```

That API helper fetches `GET /api/boulders` from the backend. The returned payload is stored in React state inside `App.tsx` and passed to smaller components.

## 4. Adding a Boulder

The form is:

```text
frontend/src/Components/BoulderForm.tsx
```

When you submit it:

```text
BoulderForm -> App.tsx -> addBoulder() -> POST /api/boulders -> ExcelStorage.append_boulder()
```

The backend saves the new row to `Boulders_Ticklist.xlsx`, then returns the refreshed dashboard payload. The frontend swaps in the new payload, so the charts update immediately.

## 5. Where to Customize the Dashboard

Use these files depending on what you want to change:

```text
frontend/src/Components/GradeChart.tsx       Grade distribution chart
frontend/src/Components/AreaChart.tsx        Area ranking chart
frontend/src/Components/AreaGradeMatrix.tsx  Area and grade table
frontend/src/Components/BoulderTable.tsx     Recent climbs table
frontend/src/Components/SummaryStrip.tsx     Top summary numbers
frontend/src/Styles/app.css                  Layout and visual styling
```

If a new visualization needs a new statistic, add the calculation in `backend/ClimbingDashboard/Api/api_service.py`, then add a TypeScript field in `frontend/src/Types/boulderTypes.ts`.

## 6. Convention Match With the Gas App

This project follows the same broad conventions as `uk-gas-supply-demand-webapp`:

- backend package under `backend/`
- FastAPI app factory in `Api/api_app.py`
- route definitions in `Api/api_router.py`
- business logic in `Api/api_service.py`
- Excel-specific behavior isolated in `Storage/excel_storage.py`
- Vite React frontend under `frontend/`
- typed API helper and typed frontend payloads
