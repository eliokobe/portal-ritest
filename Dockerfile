FROM node:20-bookworm-slim as builder

WORKDIR /app

# Build arguments - Digital Ocean las inyecta durante el build
ARG VITE_BACKEND_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Convertir a environment variables para el build
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Habilitamos Corepack para usar Yarn
RUN corepack enable

# Copiamos manifiestos para instalación determinística
COPY package.json yarn.lock ./

# Instalación con Yarn
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:stable-bookworm
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config básica SPA
RUN echo 'events { worker_connections 1024; } \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    server { \
        listen 80; \
        server_name localhost; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
            expires 1y; \
            add_header Cache-Control "public, immutable"; \
        } \
    } \
}' > /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]