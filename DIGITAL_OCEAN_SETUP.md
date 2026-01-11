# Configuración en Digital Ocean

## 🔐 Solución de Seguridad Implementada

Se ha creado un servidor backend proxy que maneja las peticiones a Airtable de forma segura, manteniendo la API key en el servidor en lugar del frontend.

## 📦 Estructura

- **Frontend** (React + Vite): Carpeta raíz del proyecto
- **Backend** (Express): Carpeta `server/`

## 🚀 Configuración en Digital Ocean App Platform

### 1. Crear dos componentes en tu App

#### Componente 1: Backend API (server/)
- **Tipo**: Web Service
- **Build Command**: `cd server && npm install`
- **Run Command**: `cd server && npm start`
- **HTTP Port**: 3001 (o el puerto que Digital Ocean asigne con $PORT)
- **Environment Variables** (Variables de entorno):
  ```
  AIRTABLE_API_KEY=tu-api-key-real-aqui
  AIRTABLE_BASE_ID=appRMClMob8KPNooU
  AIRTABLE_SERVICES_BASE_ID=appX3CBiSmPy4119D
  AIRTABLE_REGISTROS_BASE_ID=applcT2fcdNDpCRQ0
  CLIENT_URL=https://tu-app-frontend.ondigitalocean.app
  PORT=${PORT}
  ```

#### Componente 2: Frontend (raíz del proyecto)
- **Tipo**: Static Site o Web Service
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  ```
  VITE_BACKEND_URL=https://tu-backend-app.ondigitalocean.app
  ```
  ⚠️ **NO incluyas** `VITE_AIRTABLE_API_KEY` aquí

### 2. Variables de Entorno Requeridas

#### En el Backend:
```bash
AIRTABLE_API_KEY=pat***************  # Tu API key de Airtable
AIRTABLE_BASE_ID=appRMClMob8KPNooU
AIRTABLE_SERVICES_BASE_ID=appX3CBiSmPy4119D
AIRTABLE_REGISTROS_BASE_ID=applcT2fcdNDpCRQ0
CLIENT_URL=https://tu-dominio-frontend.com  # Para CORS
```

#### En el Frontend:
```bash
VITE_BACKEND_URL=https://tu-backend.ondigitalocean.app
```

### 3. Orden de Despliegue

1. **Primero**: Despliega el backend
2. **Segundo**: Copia la URL del backend
3. **Tercero**: Actualiza `VITE_BACKEND_URL` en el frontend
4. **Cuarto**: Despliega el frontend

### 4. Verificación

Una vez desplegado, verifica:

1. **Health check del backend**: 
   ```
   https://tu-backend.ondigitalocean.app/api/health
   ```
   Debería responder: `{"status":"ok","timestamp":"..."}`

2. **Frontend**: Abre el navegador y verifica que no aparezca la API key en:
   - DevTools → Network → Headers
   - DevTools → Sources → Archivos JS

## 🔒 Seguridad

- ✅ La API key **NUNCA** se envía al cliente
- ✅ Todas las peticiones a Airtable pasan por el backend
- ✅ El frontend solo conoce la URL del backend
- ✅ CORS configurado para aceptar solo tu dominio

## 🛠️ Desarrollo Local

1. **Instalar dependencias del backend**:
   ```bash
   cd server
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   # En server/.env
   cp server/.env.example server/.env
   # Edita server/.env con tu API key real
   ```

3. **Iniciar backend** (Terminal 1):
   ```bash
   cd server
   npm run dev
   ```

4. **Configurar frontend**:
   ```bash
   # En la raíz del proyecto, crea .env.local
   echo "VITE_BACKEND_URL=http://localhost:3001" > .env.local
   ```

5. **Iniciar frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

## 📝 Notas Importantes

- **NO** subas archivos `.env` a Git
- **NO** incluyas `VITE_AIRTABLE_API_KEY` en el frontend
- La API key solo debe estar en las variables de entorno del **backend** en Digital Ocean
- Actualiza `CLIENT_URL` en el backend con la URL real de tu frontend en producción

## 🐛 Troubleshooting

### Error de CORS
- Verifica que `CLIENT_URL` en el backend coincida con la URL del frontend
- Asegúrate de incluir el protocolo (`https://`) y sin barra final

### Backend no responde
- Verifica que el puerto esté correctamente configurado
- Revisa los logs en Digital Ocean
- Confirma que las variables de entorno estén configuradas

### API Key no funciona
- Verifica que `AIRTABLE_API_KEY` esté configurada en el backend
- Confirma que la API key tenga los permisos correctos en Airtable
