FROM node:20-bookworm-slim as builder

WORKDIR /app

# --- Añadir estas 4 líneas ---
ARG VITE_AIRTABLE_BASE_ID
ARG VITE_AIRTABLE_API_KEY
ENV VITE_AIRTABLE_BASE_ID=$VITE_AIRTABLE_BASE_ID
ENV VITE_AIRTABLE_API_KEY=$VITE_AIRTABLE_API_KEY
# ------------------------------

# Actualizamos npm a una versión donde el bug de dependencias opcionales de Rollup está mitigado
RUN npm install -g npm@11.5.2

# Copiamos manifiestos para instalación determinística
COPY package.json package-lock.json ./

# Intentamos instalación determinística; si por alguna razón falla, fallback a npm install
RUN npm ci || npm install

# Verificación / instalación forzada del binario nativo de Rollup para linux-x64 (workaround bug npm cli #4828)
RUN node -e "try{require('@rollup/rollup-linux-x64-gnu');console.log('Rollup native binary present')}catch(e){console.log('Missing rollup native binary, installing...');process.exit(1)}" \
 || npm install @rollup/rollup-linux-x64-gnu@4.24.0 --no-save \
 && node -e "require('@rollup/rollup-linux-x64-gnu');console.log('Rollup native binary installed OK')"

COPY . .
RUN npm run build

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