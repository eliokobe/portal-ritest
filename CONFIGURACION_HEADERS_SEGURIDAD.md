# Configuración de Headers de Seguridad

## 📋 Resumen

Este documento detalla la configuración de headers de seguridad HTTP que deben ser implementados en el servidor/CDN para proteger la aplicación contra ataques comunes.

## 🔧 Configuración en Cloudflare (Transform Rules)

### 1. Content-Security-Policy (CSP)

Previene ataques de inyección de código (XSS) limitando los orígenes de recursos.

**Header:** `Content-Security-Policy`

**Valor:**
```
default-src 'self'; 
script-src 'self' https://bmnwfimrcblnvmkbflwn.supabase.co; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
font-src 'self' data:; 
connect-src 'self' https://bmnwfimrcblnvmkbflwn.supabase.co https://api.airtable.com; 
frame-ancestors 'none';
```

**Explicación:**
- `default-src 'self'`: Por defecto, solo permite recursos del mismo origen
- `script-src`: Permite scripts del mismo origen y de Supabase
- `style-src 'unsafe-inline'`: Permite estilos inline (necesario para React)
- `connect-src`: Permite conexiones a Supabase y Airtable
- `frame-ancestors 'none'`: Previene que la página sea embebida en frames (clickjacking)

### 2. X-Frame-Options

Previene ataques de clickjacking impidiendo que la página sea embebida en un iframe.

**Header:** `X-Frame-Options`

**Valor:** `DENY`

**Explicación:**
- Niega completamente que la página sea mostrada en un frame/iframe

### 3. Strict-Transport-Security (HSTS)

Fuerza el uso de HTTPS para todas las conexiones futuras.

**Header:** `Strict-Transport-Security`

**Valor:** `max-age=31536000; includeSubDomains; preload`

**Explicación:**
- `max-age=31536000`: Fuerza HTTPS durante 1 año
- `includeSubDomains`: Aplica también a subdominios
- `preload`: Permite incluir el dominio en la lista de precarga de navegadores

### 4. X-Content-Type-Options

Previene que el navegador haga "MIME sniffing".

**Header:** `X-Content-Type-Options`

**Valor:** `nosniff`

**Explicación:**
- Evita que el navegador intente detectar el tipo de contenido diferente al declarado

### 5. Referrer-Policy

Controla cuánta información de referencia se envía con las peticiones.

**Header:** `Referrer-Policy`

**Valor:** `strict-origin-when-cross-origin`

**Explicación:**
- Envía el origen completo para peticiones del mismo sitio
- Solo envía el origen (sin path) para peticiones cross-origin

### 6. Permissions-Policy

Controla qué APIs del navegador pueden ser utilizadas.

**Header:** `Permissions-Policy`

**Valor:** `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Explicación:**
- Deshabilita acceso a cámara, micrófono, geolocalización
- Bloquea FLoC de Google (privacidad)

## 🚀 Implementación en Cloudflare

### Opción 1: Transform Rules (Recomendado)

1. Accede al Dashboard de Cloudflare
2. Selecciona tu dominio
3. Ve a **Rules** > **Transform Rules** > **Modify Response Header**
4. Crea una nueva regla con:
   - **If**: `All incoming requests` (o el path específico de tu app)
   - **Then**: Add los headers mencionados arriba uno por uno

### Opción 2: Workers

Si prefieres más control, puedes crear un Cloudflare Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newHeaders = new Headers(response.headers)
  
  // CSP
  newHeaders.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://bmnwfimrcblnvmkbflwn.supabase.co; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://bmnwfimrcblnvmkbflwn.supabase.co https://api.airtable.com; frame-ancestors 'none';"
  )
  
  // X-Frame-Options
  newHeaders.set('X-Frame-Options', 'DENY')
  
  // HSTS
  newHeaders.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  
  // X-Content-Type-Options
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  
  // Referrer-Policy
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions-Policy
  newHeaders.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

## ✅ Verificación

Para verificar que los headers están correctamente configurados:

1. **Online Tools:**
   - [securityheaders.com](https://securityheaders.com)
   - [Mozilla Observatory](https://observatory.mozilla.org)

2. **Browser DevTools:**
   - Abre las DevTools (F12)
   - Ve a la pestaña **Network**
   - Recarga la página
   - Selecciona el documento principal
   - Ve a **Headers** > **Response Headers**
   - Verifica que todos los headers de seguridad estén presentes

3. **curl (Terminal):**
```bash
curl -I https://tu-dominio.com
```

## 📊 Impacto Esperado

Una vez implementados estos headers:

- ✅ **Protección contra XSS**: CSP previene scripts maliciosos
- ✅ **Protección contra Clickjacking**: X-Frame-Options y frame-ancestors
- ✅ **Forzar HTTPS**: HSTS garantiza conexiones cifradas
- ✅ **Protección MIME**: X-Content-Type-Options previene ataques de tipo MIME
- ✅ **Privacidad mejorada**: Referrer-Policy y Permissions-Policy

## 🔄 Mantenimiento

- **Revisar CSP regularmente** si añades nuevos servicios externos
- **Actualizar dominios** en `connect-src` si cambias de APIs
- **Monitorear errores** de CSP en la consola del navegador durante desarrollo

## ⚠️ Notas Importantes

1. **Desarrollo Local:** Durante el desarrollo, CSP puede causar problemas. Puedes deshabilitarlo temporalmente o ajustar la configuración.

2. **Testing:** Prueba exhaustivamente después de implementar CSP, ya que puede bloquear recursos legítimos si no está bien configurado.

3. **HTTPS:** HSTS solo funciona si tu sitio ya está en HTTPS. Asegúrate de tener un certificado SSL válido.

4. **Compatibilidad:** Todos estos headers son ampliamente soportados por navegadores modernos.
