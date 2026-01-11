# 📖 Guía Paso a Paso: Desplegar en Digital Ocean

## ✅ Opción Recomendada: Usar App Spec (Automático)

Esta es la forma más fácil. Digital Ocean creará y configurará ambos componentes automáticamente.

### Paso 1: Sube tu código a GitHub (si no lo has hecho)

```bash
# En la raíz del proyecto
git add .
git commit -m "Añadir servidor backend seguro"
git push origin main
```

### Paso 2: Crear App en Digital Ocean

1. Ve a https://cloud.digitalocean.com/apps
2. Click en **"Create App"**
3. Selecciona **"GitHub"** como fuente
4. Autoriza Digital Ocean si es necesario
5. Selecciona tu **repositorio**
6. Selecciona la **rama** (main o master)
7. Click **"Next"**

### Paso 3: Usar el App Spec

1. En la pantalla de configuración, busca el botón **"Edit your app spec"** (esquina superior derecha)
2. Click en **"Edit your app spec"**
3. Abre el archivo `.do/app.yaml` de tu proyecto
4. **Copia TODO el contenido** del archivo
5. **Pega** en el editor de Digital Ocean (reemplaza todo el contenido)
6. **IMPORTANTE**: Edita la línea `repo:` y cambia `tu-usuario/tu-repositorio` por tu repositorio real
   - Ejemplo: `repo: elio/portal-ritest-main`
7. Click **"Save"**

### Paso 4: Configurar AIRTABLE_API_KEY

Digital Ocean mostrará una advertencia porque falta `AIRTABLE_API_KEY`:

1. En la sección **"backend"** → **Environment Variables**
2. Busca `AIRTABLE_API_KEY`
3. Click en **"Edit"** o el ícono de lápiz
4. Pega tu **API key real de Airtable** (ej: `patXXXXXXXXXXXX`)
5. Asegúrate que esté marcado como **"Secret"** o **"Encrypted"**
6. Click **"Save"**

### Paso 5: Deploy

1. Click en **"Next"** (o **"Review"**)
2. Revisa que veas:
   - ✅ **backend** (Web Service)
   - ✅ **frontend** (Static Site)
3. Click en **"Create Resources"**
4. ⏳ Espera 5-10 minutos mientras se despliega

### Paso 6: Verificar

Una vez completado:

1. Digital Ocean te mostrará las URLs:
   - `https://tu-app.ondigitalocean.app` (Frontend)
   - `https://backend-xxx.ondigitalocean.app` (Backend)

2. Prueba el backend:
   ```bash
   curl https://backend-xxx.ondigitalocean.app/api/health
   # Debe responder: {"status":"ok","timestamp":"..."}
   ```

3. Abre el frontend en tu navegador
4. Abre **DevTools** → **Network**
5. Verifica que:
   - ✅ Las peticiones van a `backend-xxx.ondigitalocean.app/api/*`
   - ✅ NO aparece `Authorization: Bearer pat...` en los headers

---

## 🔧 Opción 2: Configuración Manual (Si no quieres usar App Spec)

### Paso 1: Crear Backend

1. Ve a https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Selecciona tu **repositorio de GitHub**
4. Digital Ocean detectará automáticamente tu código
5. En **"Resources"**, debería aparecer tu app
6. Click en **"Edit Plan"** o **"Next"**

#### Configurar el Componente Backend:

1. Click en **"Add Component"** o **"Edit Component"**
2. Tipo: **"Web Service"**
3. **Source Directory**: Escribe `server`
4. **Build Command**: `npm install`
5. **Run Command**: `npm start`
6. **Port**: 8080 (Digital Ocean lo asigna automáticamente)

#### Variables de Entorno del Backend:

Click en **"Environment Variables"** y añade:

```
AIRTABLE_API_KEY=tu-api-key-real (marca como "Secret")
AIRTABLE_BASE_ID=appRMClMob8KPNooU
AIRTABLE_SERVICES_BASE_ID=appX3CBiSmPy4119D
AIRTABLE_REGISTROS_BASE_ID=applcT2fcdNDpCRQ0
CLIENT_URL=${APP_URL}
```

### Paso 2: Crear Frontend

1. En la misma App, click **"Add Component"**
2. Tipo: **"Static Site"**
3. **Source Directory**: Déjalo vacío (usa la raíz)
4. **Build Command**: `npm install && npm run build`
5. **Output Directory**: `dist`

#### Variables de Entorno del Frontend:

```
VITE_BACKEND_URL=  (déjalo vacío por ahora)
VITE_SUPABASE_URL=https://bmnwfimrcblnvmkbflwn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbndmaW1yY2JsbnZta2JmbHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTc4NDQsImV4cCI6MjA4MzYzMzg0NH0.Xdeil2_IPMFjprhFG7yoIwshqIhntNNZ3Hc6jEj6KjM
```

### Paso 3: Primer Deploy

1. Click **"Create Resources"**
2. Espera a que el **backend** se despliegue primero
3. **Copia la URL del backend** (ej: `https://backend-abc123.ondigitalocean.app`)

### Paso 4: Actualizar Frontend

1. Ve a tu App en Digital Ocean
2. Click en el componente **"frontend"**
3. Ve a **"Settings"** → **"Environment Variables"**
4. **Edita** `VITE_BACKEND_URL`
5. Pega la **URL del backend** que copiaste
6. Click **"Save"**
7. El frontend se **redespleagará automáticamente**

---

## 🎯 Resumen Rápido

**Método Automático (Recomendado):**
1. Sube código a GitHub
2. Crea App en Digital Ocean
3. Usa "Edit your app spec" y pega el contenido de `.do/app.yaml`
4. Configura `AIRTABLE_API_KEY`
5. Deploy → ¡Listo!

**Método Manual:**
1. Crea componente Backend (source: `server/`)
2. Añade variables de entorno del backend
3. Deploy
4. Copia URL del backend
5. Crea componente Frontend
6. Añade `VITE_BACKEND_URL` con la URL del backend
7. Deploy → ¡Listo!

---

## ❓ Problemas Comunes

### "No se puede encontrar el servidor"
- Verifica que `VITE_BACKEND_URL` tenga la URL correcta del backend
- Asegúrate de incluir `https://` y NO terminar con `/`

### "AIRTABLE_API_KEY no configurada"
- Ve al componente backend → Settings → Environment Variables
- Verifica que `AIRTABLE_API_KEY` esté configurada y marcada como "Secret"

### "CORS error"
- Verifica que `CLIENT_URL` en el backend tenga la URL correcta del frontend
- Si usaste `${APP_URL}`, Digital Ocean lo configura automáticamente

### Frontend no se actualiza
- Si cambias `VITE_BACKEND_URL`, el frontend debe **rebuildearse**
- Digital Ocean lo hace automáticamente, pero puedes forzarlo con "Force Rebuild"

---

¿Necesitas ayuda en algún paso específico?
