# syntax=docker/dockerfile:1

# Global ARGs — repeated per-stage since Docker resets them at each FROM.
ARG VITE_SUPABASE_URL
ARG SUPABASE_PUBLIC_ANON
ARG VITE_ADMIN_BASE_URL

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

FROM deps AS dev
COPY . .
EXPOSE 5173
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Shared base for both app builds — copies source once.
FROM deps AS build-base
COPY . .

# Participant app build
FROM build-base AS build-web
ARG VITE_SUPABASE_URL
ARG SUPABASE_PUBLIC_ANON
ARG VITE_ADMIN_BASE_URL
RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$SUPABASE_PUBLIC_ANON" \
    VITE_APP_MODE="participant" \
    VITE_ADMIN_BASE_URL="$VITE_ADMIN_BASE_URL" \
    npm run build

# Admin app build
FROM build-base AS build-admin
ARG VITE_SUPABASE_URL
ARG SUPABASE_PUBLIC_ANON
ARG VITE_ADMIN_BASE_URL
RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$SUPABASE_PUBLIC_ANON" \
    VITE_APP_MODE="admin" \
    VITE_ADMIN_BASE_URL="$VITE_ADMIN_BASE_URL" \
    npm run build

# Production image — BUILD_VARIANT selects which build to serve.
FROM nginx:1.27-alpine AS production
ARG BUILD_VARIANT=web
COPY --from=build-${BUILD_VARIANT} /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

