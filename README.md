# Vacation Bucket List

A personal web application for cataloguing, planning, and tracking future vacations and trips. Keep your travel wishlist organized with priorities, cost estimates, distance calculations, and travel notes — all in one place.

---

## Features

- **Trip Management** — Create and manage trips with details including location, status, priority, trip type, activity level, travel time, and duration.
- **Distance Calculation** — Automatically calculates driving distance from your home location to each destination via [OpenRouteService](https://openrouteservice.org/).
- **Cost Tracking** — Add itemized cost estimates per trip (flights, lodging, food, etc.) with optional currency codes and automatic per-person split calculation.
- **People Roster** — Maintain a saved list of travel companions and tag them on trips.
- **Autocomplete Fields** — Trip type, date range, and cost category fields autocomplete from your previous entries, all normalized to Title Case.
- **Filtering & Search** — Filter trips by status, priority, trip type, activity level, and distance range. Full-text search across title and location.
- **Data Export & Restore** — Export all data as a portable JSON file and restore it on any instance.
- **Trip Views** — List view with filter sidebar and detail view with full trip form.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI |
| ORM | SQLAlchemy (sync) |
| Database | SQLite (default) or MySQL |
| Schema Migrations | Alembic |
| Data Validation | Pydantic v2 |
| HTTP Client | httpx |
| Frontend | Angular 17+, Angular Material |
| Build Tool | Vite (Angular esbuild builder) |
| Distance / Geocoding | OpenRouteService API |

---

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- An [OpenRouteService API key](https://openrouteservice.org/dev/#/signup) (free tier available)
- For local development: Python 3.11+ and Node.js 22+

---

## Configuration

The backend is configured via environment variables:

| Variable | Description | Default |
|---|---|---|
| `ORS_API_KEY` | OpenRouteService API key (required for distance calc) | — |
| `DB_TYPE` | Database type: `sqlite` or `mysql` | `sqlite` |
| `DATABASE_URL` | Full SQLAlchemy connection string (overrides `DB_*` vars) | — |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_NAME` | MySQL database name | `vacation_bucket_list` |
| `DB_USER` | MySQL username | — |
| `DB_PASSWORD` | MySQL password | — |

For local development, copy `.env.example` to `.env` in the `backend/` directory and fill in your values.

---

## Building & Running with Docker Compose

Two compose configurations are provided below — one for a pre-existing MySQL database and one using a local SQLite file stored on the host.

### Option 1: External MySQL Database

Use this when you have an existing MySQL server already provisioned (e.g. a managed cloud database or a shared team instance).

```yaml
# docker-compose.mysql.yml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DB_TYPE: mysql
      DB_HOST: your-mysql-host       # hostname or IP of your MySQL server
      DB_PORT: 3306
      DB_NAME: vacation_bucket_list
      DB_USER: your_db_user
      DB_PASSWORD: your_db_password
      ORS_API_KEY: your_ors_api_key
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Run with:

```bash
docker compose -f docker-compose.mysql.yml up -d
```

The application will be available at `http://localhost`. The backend API and Swagger docs are at `http://localhost:8000/docs`.

> **Note:** Ensure the target MySQL database and user exist before starting the containers. The application will apply Alembic migrations automatically on startup and create the required tables.

---

### Option 2: SQLite on a VM (Host-Mounted Volume)

Use this when running on a VM or home server and you want the SQLite database file stored on the host filesystem for persistence and easy backup.

```yaml
# docker-compose.sqlite.yml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DB_TYPE: sqlite
      DATABASE_URL: sqlite:////config/vacation_bucket_list.db
      ORS_API_KEY: your_ors_api_key
    volumes:
      - /config/vacation-bucket-list:/config   # host path : container path
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Run with:

```bash
# Create the config directory on the host if it doesn't exist
mkdir -p /config/vacation-bucket-list

docker compose -f docker-compose.sqlite.yml up -d
```

The SQLite database file will be stored at `/config/vacation-bucket-list/vacation_bucket_list.db` on the host, surviving container restarts and upgrades.

> **Tip:** Back up the `.db` file regularly, or use the built-in **Export** feature in the Settings page to save a portable JSON backup.

---

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env            # then edit .env with your ORS_API_KEY
uvicorn main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
ng serve
```

The dev server runs at `http://localhost:4200` and proxies `/api` requests to the backend via `proxy.conf.json`.

---

## Running Tests

### Backend

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/
```

All tests run against an in-memory SQLite database. OpenRouteService calls are mocked — no real API key is needed.

### Frontend

```bash
cd frontend
npm test
```

### End-to-End (Playwright)

Start both the backend and frontend dev servers first, then:

```bash
cd frontend
npx playwright test
```

---

## API Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/trips` | List trips with optional filters (status, priority, trip type, activity level, distance, search) |
| `POST` | `/trips` | Create a new trip |
| `GET` | `/trips/{id}` | Get a single trip with cost items, people, and comments |
| `PUT` | `/trips/{id}` | Update a trip |
| `DELETE` | `/trips/{id}` | Delete a trip (cascades to cost items and comments) |
| `GET` | `/trips/autocomplete` | Autocomplete suggestions for trip type, date range, or cost category |
| `GET` | `/people` | List saved people |
| `POST` | `/people` | Add a person to the roster |
| `DELETE` | `/people/{id}` | Remove a person |
| `GET` | `/settings` | Get global settings (home city/zip) |
| `PUT` | `/settings` | Update global settings |
| `GET` | `/export` | Export all data as JSON |
| `POST` | `/export/restore` | Restore from an exported JSON file |

Full interactive API documentation is available at `/docs` when the backend is running.

---

## Project Structure

```
VacationBucketList/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── alembic/                 # Database migration scripts
│   ├── database/                # Engine, session factory, migration runner
│   ├── models/                  # SQLAlchemy ORM models + Pydantic schemas
│   ├── repositories/            # Abstract interfaces + SQLAlchemy implementations
│   ├── routers/                 # FastAPI route handlers
│   ├── services/                # Distance, autocomplete, formatting logic
│   └── tests/                   # pytest test suite
├── frontend/
│   └── src/app/
│       ├── core/                # Services, TypeScript models
│       ├── pages/               # Page components (trip list, detail, people, settings)
│       └── shared/              # Reusable components (autocomplete input, confirm dialog)
├── Dockerfile                   # Backend container image
├── frontend/Dockerfile          # Frontend multi-stage build (Angular + nginx)
├── PLAN.md                      # Detailed project design and data model
└── AGENTS.md                    # Development conventions and agent guidance
```

---

## License

See [LICENSE](LICENSE).
