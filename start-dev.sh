#!/bin/bash

# Script para iniciar el proyecto en desarrollo local
# Uso: ./start-dev.sh

echo "🚀 Iniciando Portal Ritest en modo desarrollo..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si existe .env.local
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  Creando .env.local...${NC}"
    echo "VITE_BACKEND_URL=http://localhost:3001" > .env.local
    echo -e "${GREEN}✅ .env.local creado${NC}"
fi

# Verificar si existe server/.env
if [ ! -f server/.env ]; then
    echo -e "${YELLOW}⚠️  No se encontró server/.env${NC}"
    echo "Por favor, copia server/.env.example a server/.env y configura tu AIRTABLE_API_KEY"
    echo "  cp server/.env.example server/.env"
    echo "  # Luego edita server/.env con tu API key real"
    exit 1
fi

# Verificar si las dependencias del servidor están instaladas
if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias del servidor...${NC}"
    cd server && npm install && cd ..
    echo -e "${GREEN}✅ Dependencias del servidor instaladas${NC}"
fi

# Verificar si las dependencias del frontend están instaladas
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias del frontend...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"
fi

echo ""
echo -e "${GREEN}✨ Configuración completa. Iniciando servicios...${NC}"
echo ""
echo "  📡 Backend (API Proxy):  http://localhost:3001"
echo "  🌐 Frontend:             http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener ambos servicios"
echo ""

# Iniciar backend y frontend en paralelo
# Para macOS/Linux, usa trap para limpiar procesos al salir
trap 'kill $(jobs -p)' EXIT

cd server && npm run dev &
npm run dev &

# Esperar a que ambos procesos terminen
wait
