# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

EXPOSE 8000

# All DB config is injected at runtime via environment variables:
#   DB_TYPE        sqlite (default) | mysql
#   DB_HOST        MySQL host
#   DB_PORT        MySQL port (default 3306)
#   DB_NAME        Database name
#   DB_USER        Database user
#   DB_PASSWORD    Database password
#   DATABASE_URL   Optional full SQLAlchemy connection string (overrides DB_* vars)
#   ORS_API_KEY    OpenRouteService API key
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
