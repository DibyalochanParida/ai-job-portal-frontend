# syntax=docker/dockerfile:1.7

# ---- build the static bundle
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Leave VITE_API_URL empty to call the API on the same origin (/api via nginx or the ALB).
ARG VITE_API_URL=""
ARG VITE_APP_NAME="HireLens"
ENV VITE_API_URL=$VITE_API_URL VITE_APP_NAME=$VITE_APP_NAME
RUN npm run build

# ---- serve with unprivileged nginx (listens on 8080, runs as non-root)
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
ENV API_UPSTREAM=http://api:4000 \
    NGINX_RESOLVER=127.0.0.11 \
    CSP_CONNECT_SRC="'self'"
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
