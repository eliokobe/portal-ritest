# 🔐 Solución de Seguridad Implementada

✅ **Problema resuelto**: La API key de Airtable ya NO aparecerá en los headers del navegador.

## 📋 Resumen de Cambios

### 1. **Servidor Backend Creado** (`server/`)
   - Proxy seguro para todas las peticiones a Airtable
   - La API key se mantiene en el servidor (nunca se expone al cliente)
   - Endpoints: `/api/airtable/*`, `/api/servicios/*`, `/api/registros/*`

### 2. **Frontend Actualizado**
   - Ya NO usa `VITE_AIRTABLE_API_KEY`
   - Todas las peticiones van al backend proxy
   - Solo conoce la URL del backend (`VITE_BACKEND_URL`)

### 3. **Archivos Creados**
   ```
   server/
   ├── index.js              # Servidor Express con endpoints proxy
   ├── package.json          # Dependencias del servidor
   ├── .env                  # Variables de entorno (NO subir a Git)
   ├── .env.example          # Ejemplo de configuración
   ├── .gitignore            # Protege archivos sensibles
   └── Dockerfile            # Para despliegue en Digital Ocean
   
   .do/
   └── app.yaml              # Configuración de Digital Ocean App Platform
   
   Raíz:
   ├── .env.local            # Variables locales del frontend
   ├── .env.production.example  # Ejemplo para producción
   └── DIGITAL_OCEAN_SETUP.md   # Guía de configuración
   ```

## 🚀 Pasos para Desplegar en Digital Ocean

### Opción A: Usando App Platform Spec (Recomendado)

1. **En Digital Ocean App Platform**:
   - Ve a Apps → Create App
   - Conecta tu repositorio
   - En "Resources", selecciona "Edit your app spec"
   - Pega el contenido de `.do/app.yaml`

2. **Configurar la API Key Secreta**:
   - En la interfaz de Digital Ocean
   - Ve a Settings → Environment Variables del componente "backend"
   - Agrega: `AIRTABLE_API_KEY` = `tu-api-key-real` (marcar como "Secret")

3. **Deploy**: Click en "Deploy"

### Opción B: Configuración Manual

1. **Crear Backend Component**:
   - Tipo: Web Service
   - Source: `server/`
   - Build: `npm install`
   - Run: `npm start`
   - Port: 3001
   - Variables de entorno:
     ```
     AIRTABLE_API_KEY=tu-api-key-aqui (Secret)
     AIRTABLE_BASE_ID=appRMClMob8KPNooU
     AIRTABLE_SERVICES_BASE_ID=appX3CBiSmPy4119D
     AIRTABLE_REGISTROS_BASE_ID=applcT2fcdNDpCRQ0
     CLIENT_URL=${APP_URL}
     ```

2. **Crear Frontend Component**:
   - Tipo: Static Site
   - Build: `npm install && npm run build`
   - Output: `dist`
   - Variables de entorno:
     ```
     VITE_BACKEND_URL=https://tu-backend-url.ondigitalocean.app
     ```

## 🧪 Pruebas Locales

### Terminal 1 - Backend:
```bash
cd server
npm install
# Edita server/.env con tu API key real
npm run dev
```

### Terminal 2 - Frontend:
```bash
# En la raíz del proyecto
echo "VITE_BACKEND_URL=http://localhost:3001" > .env.local
npm run dev
```

### Verificar:
1. Abre el navegador en http://localhost:5173
2. Abre DevTools → Network
3. Verifica que las peticiones vayan a `localhost:3001/api/*`
4. **Importante**: En los headers ya NO debe aparecer `Authorization: Bearer pat...`

## 📝 Variables de Entorno en Digital Ocean

### Backend (Component Settings → Environment Variables):
```bash
AIRTABLE_API_KEY=pat*************** (marcar como SECRET)
AIRTABLE_BASE_ID=appRMClMob8KPNooU
AIRTABLE_SERVICES_BASE_ID=appX3CBiSmPy4119D
AIRTABLE_REGISTROS_BASE_ID=applcT2fcdNDpCRQ0
CLIENT_URL=${APP_URL}  # Digital Ocean lo reemplaza automáticamente
```

### Frontend (Component Settings → Environment Variables):
```bash
VITE_BACKEND_URL=${backend.PUBLIC_URL}  # Se reemplaza con la URL del backend
```

## ⚠️ IMPORTANTE - Eliminar Variables Antiguas

En Digital Ocean, **ELIMINA** estas variables del frontend si las tenías:
- ❌ `VITE_AIRTABLE_API_KEY`
- ❌ `VITE_AIRTABLE_BASE_ID` (opcional, ya no se usa)
- ❌ `VITE_AIRTABLE_SERVICES_BASE_ID` (opcional, ya no se usa)

Solo debe quedar:
- ✅ `VITE_BACKEND_URL`

## ✅ Verificación Final

Después del deploy:

1. **Health check del backend**:
   ```
   curl https://tu-backend.ondigitalocean.app/api/health
   # Debe responder: {"status":"ok","timestamp":"..."}
   ```

2. **Verificar seguridad en el navegador**:
   - Abre tu app en el navegador
   - DevTools → Network → Selecciona cualquier petición
   - Headers → **NO debe aparecer "Authorization: Bearer pat..."**
   - Solo debe aparecer "Content-Type: application/json"

3. **Verificar funcionalidad**:
   - Prueba las funciones que usan Airtable
   - Verifica que los datos se carguen correctamente

## 🎉 ¡Listo!

Tu API key de Airtable ahora está segura en el servidor y no se expone en el navegador.

Para más detalles, consulta [DIGITAL_OCEAN_SETUP.md](./DIGITAL_OCEAN_SETUP.md)
