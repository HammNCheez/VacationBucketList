# syntax=docker/dockerfile:1

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source and build in production mode
COPY . .
RUN npx ng build --configuration production

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine AS final

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy Angular production build (Angular 17+ application builder outputs to browser/)
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# nginx config: copied to templates so nginx startup runs envsubst for BACKEND_URL
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default backend target for API proxy (override in docker compose if needed)
ENV BACKEND_URL=http://localhost:8000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
