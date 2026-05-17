# syntax=docker/dockerfile:1

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

FROM deps AS build
ARG VITE_SUPABASE_URL
ARG SUPABASE_PUBLIC_ANON
ARG BUILD_MODE=participant
ARG VITE_ADMIN_BASE_URL
COPY . .
RUN VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
    VITE_SUPABASE_ANON_KEY="$SUPABASE_PUBLIC_ANON" \
    VITE_APP_MODE="$BUILD_MODE" \
    VITE_ADMIN_BASE_URL="$VITE_ADMIN_BASE_URL" \
    npm run build

FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
