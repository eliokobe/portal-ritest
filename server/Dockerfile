# Dockerfile para el servidor backend
FROM node:20-bookworm-slim

WORKDIR /app

# Copiar archivos de configuración
COPY package.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY index.js ./

# Exponer el puerto
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
