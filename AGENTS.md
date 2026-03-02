# AGENTS.md

## Purpose
Guidance and conventions for a dev agent working on VacationBucketList (FastAPI backend + Angular frontend). Enables consistent development, automated tasks, and clear ownership for code changes.

## Responsibilities (Agent)
- Implement features and fixes following PLAN.md.
- Run and validate tests (unit, integration, e2e).
- Maintain code style, linting, and CI hygiene.
- Mock or gate external APIs (OpenRouteService) in tests.
- Produce clear PRs and follow the PR checklist.
- Keep secrets out of VCS; use .env for local development.

## Tech Stack
- Backend: Python 3.11+, FastAPI, SQLAlchemy (sync), Pydantic v2, httpx
- Database: SQLite (abstracted repository layer; in-memory for tests)
- Frontend: Angular 17+, Angular Material, TypeScript, Vite/esbuild build
- Testing: pytest + FastAPI TestClient, Jasmine/Karma for Angular unit tests, Playwright for E2E
- Tooling: black, isort, flake8/ruff (Python); ESLint, Prettier (TS); python-dotenv for config
- External APIs: OpenRouteService (geocoding & directions) — always mocked in CI/tests

## Repo Layout (reference)
Follow PLAN.md structure. Agent scripts and automation should assume:
- backend/
- frontend/
- tests/ (backend integration)
- e2e/ (playwright)

## Development Guidelines

General
- Favor small, focused commits and PRs.
- Document non-obvious design rationale in code comments or in a short note on the PR.
- Do not commit secrets; add .env to .gitignore. Commit .env.example instead.

Branching / Commits
- Branches: feature/<short-desc>, fix/<short-desc>, chore/<short-desc>.
- Commit messages: Imperative, short subject line; optional body. Example:
    - "Add distance calculation retry in distance service"
- Squash or rebase to keep history linear for feature branches if requested by repo policy.

PR Checklist (required)
- All tests pass locally and in CI.
- Linting and formatting applied (black/isort for Python; Prettier/ESLint for TS).
- CI config updated if new dependencies or steps required.
- Documentation updated (PLAN.md/AGENTS.md) if behavior or APIs change.
- No secrets in diffs.

Python / Backend Conventions
- Style: Follow PEP 8; run black + isort on changes.
- Typing: Use type hints everywhere; prefer explicit types for public functions and Pydantic models.
- Naming:
    - Modules/files: snake_case.py
    - Classes: PascalCase
    - Functions/variables: snake_case
    - Constants: UPPER_SNAKE_CASE
- DB models: SQLAlchemy ORM classes named in singular (Trip, CostItem); table names may be plural.
- Repositories: Implement interfaces in repositories/base.py and wire concrete classes via DI.
- Services: Stateless service classes (distance.py, formatting.py); side effects only in repositories or routers.
- Validation:
    - Use Pydantic v2 for request/response schemas.
    - Enforce Title Case normalization server-side in formatting service.
    - Return 422 for validation errors; soft-fail ORS calls with warning payloads.
- Time: Store datetimes in UTC; use timezone-aware datetime objects.
- Logging: Structured, module-level loggers. Use WARNING/ERROR for external API failures and include context (trip id, ORS error).
- Testing:
    - Use in-memory SQLite and dependency overrides for get_db in tests/conftest.py.
    - Mock httpx/OpenRouteService calls deterministically.
    - Cover repository abstraction with an in-memory stub.
- Secrets: Load ORS_API_KEY from .env; fail gracefully when missing.

Angular / Frontend Conventions
- File & symbol naming:
    - Files: kebab-case (trip-list.component.ts)
    - Classes/components: PascalCase (TripListComponent)
    - Services: camelCase filename with .service.ts suffix; class name Service suffix.
    - Models/interfaces: PascalCase for interface names; place in core/models/.
- Component architecture:
    - Smart/dumb pattern: pages contain state; shared components are presentational.
    - Use Reactive Forms for trip detail form.
    - Use OnPush change detection where possible.
    - Use async pipe to subscribe to Observables; avoid manual unsubscribe when possible.
- State & services:
    - Centralize HTTP calls in services (trip.service.ts, people.service.ts).
    - Map backend schema to TypeScript interfaces; keep one source of truth for API shapes.
- UI:
    - Use Angular Material components and theming.
    - Use accessible ARIA attributes and keyboard navigation for custom controls.
- Linting & formatting:
    - ESLint + Prettier; run on save / CI.
- Testing:
    - Unit tests for services and components (Jasmine/Karma).
    - E2E via Playwright: run against dev server with a seeded test DB.
- Build & Run:
    - Use proxy.conf.json for /api → backend in dev.

API & Data Contracts
- RESTful plural resources: /trips, /people, /settings, /export.
- Query param encoding: repeated params for multi-select filters (status=Wishlist&status=Booked).
- Return code guidance:
    - 200 for successful GET/PUT
    - 201 for created resources
    - 204 for deleted
    - 400 for invalid query params
    - 422 for validation errors
- Export: single JSON document with schema_version and exported_at.

Automation & CI
- CI steps:
    - Install dependencies
    - Run backend unit tests (pytest)
    - Run frontend unit tests (ng test or npm test)
    - Run linters and formatters
    - Optionally run Playwright E2E in a later stage with seeded DB
- Mock external services in CI; do not call ORS.
- Provide a reproducible local test task that seeds DB and starts local services.

Agent Operational Tips
- For any change that touches distance calculation:
    - Add tests for ORS success and failure paths.
    - Ensure the API warns (DISTANCE_UNAVAILABLE) but still persists other fields.
- For autocomplete changes:
    - Normalize server-side and ensure distinct sorted results endpoint exists.
- When modifying data models:
    - Update repositories, Pydantic schemas, frontend models, tests, and export shape.
    - Add migration note in PLAN.md / AGENTS.md; until Alembic is adopted, create_all() is used.

Common Suggestions
- Keep PRs small and focused.
- Run formatting and tests before pushing.
- Prefer composition over inheritance for services.
- Write tests first for critical behaviors (distance recalc, cascade delete, derived values).
- Keep UI behavior deterministic for E2E tests (avoid unpredictable timers or animations).
- Maintain a single source of truth for enum values (status, priority) in backend and mirror values in frontend models.

Quick Dev Commands (examples)
- Backend:
    - python -m venv .venv; .venv\Scripts\activate
    - pip install -r backend/requirements.txt
    - uvicorn backend.main:app --reload --port 8000
    - pytest backend/tests
- Frontend:
    - cd frontend
    - npm install
    - ng serve
    - npm test
- E2E:
    - Start backend and frontend local dev servers, then run Playwright suite.

Contact & Escalation
- If repeated ORS failures or schema drift is observed, open an issue and tag backend owners for a design decision (caching, retries, or migration to a more reliable geocoding provider).

(Keep AGENTS.md updated as the project evolves; any changes to PLAN.md that affect workflows or contracts should be mirrored here.)