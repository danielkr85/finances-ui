# syntax=docker/dockerfile:1

# ---- Build: production Angular bundle ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

# ---- Runtime: static files served by Caddy on :80 (TLS is terminated by the edge proxy in finances-deploy) ----
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/finances/browser /srv
EXPOSE 80
