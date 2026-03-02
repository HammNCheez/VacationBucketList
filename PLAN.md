# Vacation Bucket List — Project Plan

## Overview

A web application for cataloguing and planning future vacations and trips. A Python FastAPI backend with SQLite (behind a repository abstraction), paired with an Angular SPA frontend. Distance is calculated via OpenRouteService. 

---

## Data Model

### Trip

The central record of the application.

| Field | Type | Details |
|---|---|---|
| `id` | int | Primary key |
| `title` | string | Name of the trip (e.g. "Tokyo — Cherry Blossom Season") |
| `location` | string | City / region / country |
| `location_lat` | float | Geocoded latitude (from OpenRouteService) |
| `location_lng` | float | Geocoded longitude (from OpenRouteService) |
| `origin` | string | Origin city/zip — defaults to Settings home location; can be overridden per trip |
| `origin_lat` | float | Geocoded latitude of origin |
| `origin_lng` | float | Geocoded longitude of origin |
| `distance_miles` | float | Driving distance from origin → location (persisted, not recalculated on every read) |
| `status` | enum | One of: Wishlist, Actively Planning, Booked, Completed, Cancelled |
| `priority` | enum | One of: Must-do, Want-to, Nice-to-have |
| `trip_types` | string (JSON array) | User-defined tags (e.g. Camping, Family, Culture) — autocompletes from all previous values, stored as Title Case |
| `travel_time_hours` | float | Transit time each way (hours) |
| `duration_days` | float | Time spent at the location (days) |
| `total_trip_length` | — | **Derived, not stored:** `duration_days` days + (`travel_time_hours` × 2) hours (convert >24 hour travel times to days, leaving the partial day hours remainder)|
| `target_date_start` | date | Optional specific start date |
| `target_date_end` | date | Optional specific end date |
| `target_date_range` | string | Free-text range label (e.g. "Summer 2027") — autocompletes from previous values, stored as Title Case |
| `notes` | string | Free-form rich text description |
| `created_at` | datetime | Set on creation |
| `updated_at` | datetime | Updated on every save |

### Cost Item

Each trip has zero or more cost line items.

| Field | Type | Details |
|---|---|---|
| `id` | int | Primary key |
| `trip_id` | int | FK → trips.id (cascade delete) |
| `category` | string | User-defined category (e.g. Flights, Lodging, Visa) — autocompletes from all previous values, stored as Title Case |
| `amount` | float | Estimated cost |
| `currency` | string | Optional currency code (e.g. USD, EUR) |

**Per-person split** is derived: sum of all cost item amounts ÷ number of tagged people. Displayed only, never stored.

### Person (Roster)

A saved list of family / friends who might join a trip.

| Field | Type | Details |
|---|---|---|
| `id` | int | Primary key |
| `name` | string | Person's name |

### Trip ↔ Person (join table)

Many-to-many relationship between trips and people.

| Field | Type | Details |
|---|---|---|
| `trip_id` | int | FK → trips.id |
| `person_id` | int | FK → people.id |

### Comment

Discrete entries attached to a trip (links, photos, notes).

| Field | Type | Details |
|---|---|---|
| `id` | int | Primary key |
| `trip_id` | int | FK → trips.id (cascade delete) |
| `body` | string | Text content |
| `url` | string | Optional URL (blog post, hotel site, photo link, etc.) |
| `created_at` | datetime | Set on creation |

### Settings

Single-row key/value table for global configuration.

| Key | Details |
|---|---|
| `home_city` | Default origin city for distance calculations (authoritative default origin when trip `origin` is omitted) |
| `home_zip` | Default origin zip code |

---

## Behaviors

### Autocomplete Fields

All three autocomplete fields normalize input to **Title Case** on save (server-side, before any DB write). Autocomplete suggestions are fetched from a dedicated endpoint that returns distinct values across all records.

| Field | Source |
|---|---|
| Trip Type | All `trip_types` values across all trips |
| Target Date Range | All `target_date_range` values across all trips |
| Cost Category | All `category` values across all cost line items |

### Distance Calculation

1. Geocode the origin and destination (location) using OpenRouteService to get lat/lng pairs.
2. Call the OpenRouteService Directions API to get driving distance in miles.
3. Persist `distance_miles`, `location_lat`, `location_lng`, `origin_lat`, `origin_lng` on the trip row.
4. Distance is only recalculated when the `location` or `origin` field changes on update.
5. If OpenRouteService fails (timeout, 4xx/5xx, quota/rate-limit, geocode miss), trip create/update still succeeds (soft-save), and distance fields remain `null` (or become `null` on recalc failure).
6. API response includes a non-fatal warning payload when distance calculation fails

### Total Trip Length (Derived)

Displayed on the trip detail and list card; never stored:

```
Total Length = duration_days days + (travel_time_hours × 2) hours (convert >24 hour travel times to days, leaving the partial day hours remainder)
```

Shown as days and hours (e.g. "9 days, 4 hours").

### Per-Person Cost Split (Derived)

Displayed on the trip detail page; never stored:

```
Per-Person Cost = sum(cost_items.amount) / count(trip_people)
```

Only shown when at least one person is tagged and all trip cost items use a single currency code (or all are empty).

### Input/Validation Rules

- `target_date_start` and `target_date_end` are independently optional.
- If both are provided, `target_date_start <= target_date_end` is required.
- `travel_time_hours` must be `>= 0`.
- `duration_days` must be `>= 0`.
- `amount` must be `>= 0`.
- `distance_min` / `distance_max` query params must be `>= 0`; if both are present, `distance_min <= distance_max`.
- `currency`, when provided, must be a 3-letter uppercase code.

### Notes Content Policy

- `notes` and `comment.body` are plain text for MVP (no HTML rendering).
- Backend stores and returns text as-is after normal string validation.
- Frontend renders as escaped text only.

### Trip List Filters

- **Filter by Status** — multi-select chips (Wishlist, Actively Planning, Booked, Completed, Cancelled)
- **Filter by Priority** — multi-select chips (Must-do, Want-to, Nice-to-have)
- **Filter by Trip Type** — multi-select chips drawn from all known trip types
- **Filter by Distance** — min/max numeric range inputs (miles); filters against persisted `distance_miles`
- **Search** — matches against trip title or location name (case-insensitive)

For multi-select filters (`status`, `priority`, `trip_type`), API encoding is **repeated query params**:

```
GET /trips?status=Wishlist&status=Booked&priority=Must-do
```

**Default sort:** Priority tier (Must-do → Want-to → Nice-to-have), then by distance ascending within tier.

### Data Export

`GET /export` returns a single JSON document containing all trips (with nested cost items, people, and comments), the people roster, and settings. Export payload includes `schema_version` and `exported_at` metadata for forward compatibility. The Angular Settings page offers a download button that triggers this and saves the file as `vacations-export-YYYY-MM-DD.json`.

Import/restore is explicitly out of scope for MVP.

---

## Implementation Plan

### Technology Stack

| Layer | Choice |
|---|---|
| Backend language | Python 3.11+ |
| Backend framework | FastAPI |
| ORM | SQLAlchemy (sync) |
| Database | SQLite (via abstracted repository layer) |
| Data validation | Pydantic v2 |
| HTTP client (distance) | httpx |
| Config / secrets | python-dotenv (.env file) |
| Frontend framework | Angular 17+ |
| UI component library | Angular Material |
| Frontend build tool | Vite (via Angular's esbuild builder) |
| Distance / geocoding API | OpenRouteService |

### Project Structure

```
VacationBucketList/
├── PLAN.md
├── backend/
│   ├── main.py                    # FastAPI app entry point, CORS, router registration
│   ├── .env                       # ORS_API_KEY (never committed)
│   ├── .env.example               # Template — committed to version control
│   ├── requirements.txt
│   ├── database/
│   │   ├── __init__.py
│   │   ├── connection.py          # SQLAlchemy engine + session factory + get_db dependency
│   │   └── schema.py              # Base.metadata.create_all() on startup
│   ├── models/
│   │   ├── __init__.py
│   │   ├── db.py                  # SQLAlchemy ORM models
│   │   └── schemas.py             # Pydantic request/response schemas
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py                # Abstract repository interfaces (ITripRepository, etc.)
│   │   ├── trip_repo.py           # SQLite implementation of ITripRepository
│   │   ├── people_repo.py         # SQLite implementation of IPeopleRepository
│   │   └── settings_repo.py       # SQLite implementation of ISettingsRepository
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── trips.py               # /trips CRUD + filter + autocomplete
│   │   ├── people.py              # /people CRUD
│   │   ├── settings.py            # /settings GET + PUT
│   │   └── export.py              # /export GET
│   ├── services/
│   │   ├── __init__.py
│   │   ├── distance.py            # OpenRouteService geocode + driving distance
│   │   ├── autocomplete.py        # Aggregate distinct autocomplete values
│   │   └── formatting.py          # Title Case normalization
│   └── tests/
│       ├── conftest.py            # In-memory DB fixture, TestClient, ORS mock
│       ├── test_trips.py
│       ├── test_autocomplete.py
│       ├── test_formatting.py
│       ├── test_people.py
│       ├── test_settings.py
│       ├── test_export.py
│       └── test_repository.py
└── frontend/                      # Angular workspace (ng new frontend)
    ├── proxy.conf.json             # Dev proxy: /api → http://localhost:8000
    ├── src/app/
    │   ├── core/
    │   │   ├── services/
    │   │   │   ├── trip.service.ts
    │   │   │   ├── people.service.ts
    │   │   │   └── settings.service.ts
    │   │   └── models/            # TypeScript interfaces matching API schemas
    │   ├── shared/
    │   │   └── autocomplete-input/ # Reusable mat-autocomplete wrapper component
    │   └── pages/
    │       ├── trip-list/          # Main list with filter bar
    │       ├── trip-detail/        # Add / edit trip form
    │       ├── people/             # Roster management
    │       └── settings/           # Home location form + export button
    ├── e2e/
    │   ├── playwright.config.ts
    │   ├── trips.spec.ts
    │   ├── autocomplete.spec.ts
    │   ├── filters.spec.ts
    │   ├── people.spec.ts
    │   └── settings.spec.ts
    └── angular.json                # Updated to include proxy.conf.json
```

### API Routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/trips` | List trips; query params: repeated `status`, repeated `priority`, repeated `trip_type`, `distance_min`, `distance_max`, `search`, optional `target_date_start`, `target_date_end` |
| `POST` | `/trips` | Create trip; triggers distance calc; normalizes Title Case fields |
| `GET` | `/trips/{id}` | Single trip with nested cost items, people, and comments |
| `PUT` | `/trips/{id}` | Update trip; re-runs distance calc if location or origin changed |
| `DELETE` | `/trips/{id}` | Delete trip (cascades to cost items, comments, trip_people) |
| `GET` | `/trips/autocomplete` | `?field=trip_type\|target_date_range\|cost_category` — returns sorted distinct values |
| `GET` | `/people` | List all people |
| `POST` | `/people` | Add a person to the roster |
| `DELETE` | `/people/{id}` | Remove a person |
| `GET` | `/settings` | Get current settings |
| `PUT` | `/settings` | Update settings |
| `GET` | `/export` | Full JSON dump of all data |

### Repository Abstraction

Abstract interfaces in `repositories/base.py` define the contract (e.g. `ITripRepository.list(filters) -> list[Trip]`). FastAPI dependency injection wires the SQLite concrete implementation at startup. Swapping the datastore (e.g. to PostgreSQL) requires only a new concrete class and a one-line change in the dependency provider — no router or service code changes.

### Build & Run

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Swagger UI available at http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm install
ng serve
# App available at http://localhost:4200
# /api requests proxied to http://localhost:8000
```

### Verification Steps

1. Hit `http://localhost:8000/docs` and exercise all endpoints via Swagger UI.
2. Add a trip in the Angular UI and confirm `distance_miles` populates.
3. Add two trips with the same Trip Type — confirm autocomplete returns the shared value in Title Case.
4. Apply distance filter — confirm only trips within the range appear.
5. Click Export in Settings — confirm valid JSON downloads with all data.
6. Swap the SQLite repository for an in-memory dict stub to confirm the abstraction layer is clean.

---

## Test Plan

### Backend Tests — pytest + FastAPI `TestClient`

Each test module uses an **in-memory SQLite database** via a dependency override for `get_db`, so tests are fully isolated and fast. The OpenRouteService HTTP calls are mocked so no real API key is needed.

#### `tests/conftest.py` — shared fixtures
- In-memory SQLite engine with `create_all()` and per-test teardown
- `TestClient` with `get_db` dependency override pointing at the in-memory DB
- ORS mock fixture that returns deterministic geocode + distance values

#### `tests/test_formatting.py` — Title Case service unit tests
- `"camping"` → `"Camping"`
- `"FAMILY TRIP"` → `"Family Trip"`
- `"the rocky mountains"` → `"The Rocky Mountains"`
- Already Title Case input is unchanged
- Empty string returns empty string

#### `tests/test_trips.py` — Trip CRUD
- `POST /trips` with all required fields → 201, body contains assigned `id` and all submitted fields
- `GET /trips` returns the newly created trip in the list
- `GET /trips/{id}` returns the correct trip with nested cost items, people, and comments
- `GET /trips/{id}` with a non-existent ID → 404
- `PUT /trips/{id}` updates mutable fields; `updated_at` changes, `created_at` does not
- `DELETE /trips/{id}` → 204; subsequent `GET /trips/{id}` → 404
- `POST /trips` with missing required fields → 422 validation error

#### `tests/test_trips.py` — Cascade delete
- Create a trip with cost items, comments, and a tagged person; delete the trip; verify all child records are also gone from their respective tables

#### `tests/test_trips.py` — Distance recalculation
- Mock the ORS service; create a trip and confirm `distance_miles` is populated
- Update a trip's `notes` only → ORS mock is **not** called again
- Update a trip's `location` → ORS mock **is** called again and `distance_miles` updates
- Simulate ORS failure on create/update → request still succeeds and returns warning with `DISTANCE_UNAVAILABLE`, with `distance_miles` set to `null`

#### `tests/test_trips.py` — Derived values
- Trip with `travel_time_hours=3`, `duration_days=7` → response includes `total_trip_length` = "7 days, 6 hours"
- Trip with 2 people tagged and cost items totalling $1000 → `per_person_cost` = $500.00 in the response
- Trip with 0 people → `per_person_cost` is `null` / absent

#### `tests/test_trips.py` — Filters
- Status filter: create Wishlist and Booked trips; `GET /trips?status=Wishlist` returns only the Wishlist one
- Priority filter: create Must-do and Nice-to-have trips; filter returns only the correct tier
- Trip type filter: two trips with different types; filter by one type returns only the matching trip
- Multi-select repeated params: `GET /trips?status=Wishlist&status=Booked` returns trips in either status
- Distance filter: trips at 50 mi and 300 mi; `GET /trips?distance_min=100&distance_max=400` returns only the 300 mi trip
- Search: case-insensitive match on title and location; non-matching query returns empty list
- Combined filters (status + priority) apply AND logic

#### `tests/test_trips.py` — Default sort order
- Create trips across all three priority tiers; `GET /trips` returns them in Must-do → Want-to → Nice-to-have order, with distance ascending within each tier

#### `tests/test_autocomplete.py` — Autocomplete aggregation
- Create two trips with Trip Types `"camping"` and `"family"`; `GET /trips/autocomplete?field=trip_type` returns `["Camping", "Family"]` (Title Case, sorted)
- Create trips with `target_date_range` `"summer 2027"` on two trips; autocomplete returns `["Summer 2027"]` (deduplicated)
- Create cost items with category `"FLIGHTS"` and `"flights"`; autocomplete returns `["Flights"]` (deduplicated, Title Case)
- Unknown `?field=` value → 400 error
- No records yet for a field → returns empty list without error

#### `tests/test_people.py` — People CRUD
- `POST /people` → person appears in `GET /people`
- `DELETE /people/{id}` → person removed; their join records removed; trips that referenced them still exist
- Duplicate names are allowed (no uniqueness constraint)

#### `tests/test_settings.py` — Settings
- `GET /settings` on a fresh DB returns empty/default values without error
- `PUT /settings` with `home_city` + `home_zip` → `GET /settings` returns the same values
- Creating a trip with no `origin` field uses the saved `home_city` as the default origin
- Creating a trip with no `origin` and empty `home_city` still succeeds, but distance remains unavailable (`null` + warning)

#### `tests/test_export.py` — Data export
- `GET /export` returns valid JSON with top-level keys: `schema_version`, `exported_at`, `trips`, `people`, `settings`
- Each trip in the export contains nested `cost_items`, `people`, and `comments`
- After deleting a trip, it does not appear in a subsequent export
- An empty database returns `{ "trips": [], "people": [], "settings": {} }`

#### `tests/test_repository.py` — Repository abstraction
- Instantiate the in-memory dict stub repository (not the SQLite one) and run the same CRUD assertions — confirms the interface contract is honoured independently of the storage engine

---

### Frontend Tests — Angular Unit & Integration (Jasmine / Karma)

#### `trip.service.spec.ts`
- `getTrips()` makes `GET /api/trips` and maps the response to `Trip[]`
- `createTrip()` makes `POST /api/trips` with the correct body
- `updateTrip()` makes `PUT /api/trips/{id}`
- `deleteTrip()` makes `DELETE /api/trips/{id}`
- `getAutocomplete(field)` makes `GET /api/trips/autocomplete?field={field}`

#### `people.service.spec.ts` and `settings.service.spec.ts`
- Parallel CRUD and HTTP mapping coverage for their respective endpoints

#### `autocomplete-input.component.spec.ts`
- Renders suggestions fetched from the service
- Selecting a suggestion fills the input
- Suggestions are displayed in Title Case

#### `trip-list.component.spec.ts`
- Renders a card/row for each trip returned by the service
- Status filter chip toggles update the query params sent to `getTrips()`
- Distance min/max inputs update the query params
- Search input debounces and updates the query

#### `trip-detail.component.spec.ts`
- Form is invalid when required fields are missing; submit button is disabled
- On valid submit, `createTrip()` is called with the correct payload
- On edit, form pre-fills with existing trip data and calls `updateTrip()` on submit
- Adding a cost item row increases the cost item count; removing it decreases it
- Total trip length display updates reactively as `travel_time_hours` and `duration_days` change
- Per-person cost display updates reactively as cost items or tagged people change

#### `settings.component.spec.ts`
- Export button calls `GET /api/export` and triggers a file download named `vacations-export-YYYY-MM-DD.json`

---

### E2E Tests — Playwright (full-stack, browser-driven)

Tests run against the live Angular dev server and FastAPI backend, with a clean test database seeded before each suite.

#### `e2e/trips.spec.ts` — Trips happy path
- Navigate to the trip list on a fresh DB; "No trips yet" empty state is shown
- Click Add Trip, fill all fields (including a cost item and a tagged person), save — trip card appears in the list
- Click the trip card; detail view shows correct derived total length and per-person cost
- Edit the trip title; list card reflects the change
- Delete the trip; list returns to empty state

#### `e2e/autocomplete.spec.ts` — Autocomplete behaviour
- Add a trip with Trip Type `"camping"`; add a second trip and type `"c"` in the Trip Type field — `"Camping"` appears as a suggestion
- Accept the suggestion; saved value is `"Camping"` (Title Case)
- Same flow for Target Date Range and Cost Category

#### `e2e/filters.spec.ts` — Filters
- Seed two trips (Wishlist/Must-do and Booked/Nice-to-have); apply Status=Wishlist filter — only one trip visible
- Apply Priority=Must-do filter — same result; clear filters — both trips visible
- Enter a distance range that excludes one trip — only one trip is visible

#### `e2e/people.spec.ts` — People roster
- Add two people; both appear in the roster list
- Tag both on a new trip; per-person cost split shows correctly on the trip detail
- Delete one person from the roster; they are no longer selectable on the trip form; the existing trip still exists

#### `e2e/settings.spec.ts` — Settings and export
- Save a home city; create a trip with no origin override — origin field on the trip detail shows the saved home city
- Click Export; a JSON file downloads and contains the created trips and people

---

### Additional Coverage Rationale

The following test cases go beyond the basic Verification Steps but cover real failure modes found in apps of this type:

| Area | Why it matters |
|---|---|
| Cascade delete | Without it, orphaned cost items / comments silently accumulate in the DB |
| Distance skipped on unchanged fields | Prevents unnecessary ORS API calls on every edit |
| Derived values (total length, per-person cost) | Core display logic — easy to get the arithmetic wrong |
| Default sort order | The list is only useful if highest-priority trips surface first |
| Empty/null autocomplete states | A fresh DB must not error when no prior values exist |
| Combined filter AND logic | Individual filter tests pass but combined queries often reveal bugs |
| ORS soft-failure behavior | External API instability must not block local trip edits |
| Export on empty DB | Ensures the export endpoint never returns 500 on a fresh install |
| Repository abstraction contract | Confirms the interface is honoured so the datastore can be swapped safely |

---

## Open Decisions / Future Work

- **Security boundary (MVP)** — app is local-only. Do not expose backend publicly or over the open internet without adding authentication first.
- **Alembic migrations** — `create_all()` on startup is sufficient while the schema is in flux; add Alembic when either (a) first non-dev deployment starts, or (b) two consecutive schema changes are needed after sample data exists.
- **Photo uploads** — Comments currently support a URL to a photo. True file upload can be added as a future enhancement.
- **Multi-currency totals** — Cost items may carry a currency, but per-person split is only displayed for single-currency trips. Currency conversion can be added later.
- **Offline / PWA** — Not in scope for the initial build.
