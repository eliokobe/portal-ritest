require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const compression = require('compression');
const NodeCache = require('node-cache');

const app = express();
// #region agent log
fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:10',message:'Checking PORT env variable',data:{envPort:process.env.PORT},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion
const PORT = process.env.PORT || 3001;

// Configuración de caché en memoria
// stdTTL: 180 segundos (3 minutos) - tiempo que los datos se consideran frescos
// checkperiod: 60 segundos - cada cuánto limpia datos expirados
const cache = new NodeCache({ 
  stdTTL: 180, 
  checkperiod: 60,
  useClones: false // Mejora el rendimiento
});

// Configuración de Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const SERVICIOS_BASE_ID = process.env.AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
const REGISTROS_BASE_ID = process.env.AIRTABLE_REGISTROS_BASE_ID || 'applcT2fcdNDpCRQ0';
const VALORACIONES_BASE_ID = process.env.AIRTABLE_VALORACIONES_BASE_ID || 'appX3CBiSmPy4119D';

// CORS configurado para tu dominio
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [CLIENT_URL, 'https://portal.ritest.es', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

// Compresión GZIP para reducir tamaño de respuestas
app.use(compression());

// Aumentar límite de tamaño del body para archivos (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Función para crear cliente de Airtable
function createAirtableClient(baseId) {
  return axios.create({
    baseURL: `https://api.airtable.com/v0/${baseId}`,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}

// ============================================
// MIDDLEWARE DE CACHÉ
// ============================================
function cacheMiddleware(req, res, next) {
  // Solo cachear peticiones GET y POST de lectura (con filtros)
  const isReadPost = req.method === 'POST' && req.body && req.body.filterParams;
  if (req.method !== 'GET' && !isReadPost) {
    return next();
  }

  // Crear clave única basada en URL, query params y body
  const cacheKey = `${req.method}:${req.path}?${JSON.stringify(req.query)}&${JSON.stringify(req.body)}`;
  
  // Verificar si existe en caché
  const cachedData = cache.get(cacheKey);
  
  if (cachedData) {
    console.log(`💾 Cache HIT: ${req.path}`);
    return res.json(cachedData);
  }
  
  console.log(`🔄 Cache MISS: ${req.path}`);
  
  // Guardar función original de res.json
  const originalJson = res.json.bind(res);
  
  // Sobrescribir res.json para cachear la respuesta
  res.json = function(data) {
    // Guardar en caché
    cache.set(cacheKey, data);
    // Enviar respuesta original
    return originalJson(data);
  };
  
  next();
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// UPLOAD ATTACHMENT
// ============================================
const uploadAttachmentHandler = async (req, res) => {
  try {
    const { baseId, recordId, fieldName, file } = req.body;
    
    if (!baseId || !recordId || !fieldName || !file) {
      console.error('❌ Missing fields:', { baseId, recordId, fieldName, hasFile: !!file });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`📤 Uploading attachment: ${file.filename} (${Math.round(file.data.length / 1024)} KB)`);
    
    if (!AIRTABLE_API_KEY) {
      console.error('❌ AIRTABLE_API_KEY is not defined in backend');
      return res.status(500).json({ error: 'Backend configuration error: API Key missing' });
    }
    
    const response = await axios.post(
      `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldName}/uploadAttachment`,
      {
        contentType: file.contentType,
        file: file.data,
        filename: file.filename
      },
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    console.log('✅ Attachment uploaded successfully');
    
    if (typeof cache !== 'undefined' && cache.flushAll) {
      console.log('🧹 Flushing cache after upload');
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error uploading attachment:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
};

app.post('/api/upload-attachment', uploadAttachmentHandler);
app.post('/upload-attachment', uploadAttachmentHandler);

// ============================================
// PROXY SERVICIOS (sin autenticación JWT)
// ============================================
app.all('/api/servicios/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    
    console.log(`📡 Proxy Servicios: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Servicios:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.all('/servicios/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    
    console.log(`📡 Proxy Servicios: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Servicios:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// PROXY REGISTROS (sin autenticación JWT)
// ============================================
app.all('/api/registros/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(REGISTROS_BASE_ID);
    
    console.log(`📡 Proxy Registros: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Registros:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.all('/registros/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(REGISTROS_BASE_ID);
    
    console.log(`📡 Proxy Registros: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Registros:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// ============================================
// PROXY VALORACIONES (sin autenticación JWT)
// ============================================
app.all('/api/valoraciones/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(VALORACIONES_BASE_ID);
    
    console.log(`📡 Proxy Valoraciones: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Valoraciones:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.all('/valoraciones/:tableName*', cacheMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(VALORACIONES_BASE_ID);
    
    console.log(`📡 Proxy Valoraciones: ${req.method} /${tableName}${path}`);
    
    // Si es POST y tiene filterParams en el body, moverlos a query params
    let params = req.query;
    let data = req.body;
    
    if (req.method === 'POST' && req.body.filterParams) {
      params = { ...req.query, ...req.body.filterParams };
      data = req.body.data || {};
    }
    
    const config = {
      method: req.method === 'POST' && req.body.filterParams ? 'GET' : req.method,
      url: `/${tableName}${path}`,
      params: params,
      data: data
    };

    const response = await client.request(config);

    // Invalidar caché si es una mutación exitosa (POST de creación, PATCH, DELETE, etc.)
    const isMutation = req.method !== 'GET' && !(req.method === 'POST' && req.body && req.body.filterParams);
    if (isMutation) {
      console.log(`🧹 Invalidad caché por mutación: ${req.method} ${req.path}`);
      cache.flushAll();
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Valoraciones:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:417',message:'Server starting',data:{actualPort:PORT},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`🌐 CORS: ${CLIENT_URL}`);
  if (!AIRTABLE_API_KEY) {
    console.error('⚠️  ADVERTENCIA: AIRTABLE_API_KEY no configurada');
  } else {
    console.log('✅ AIRTABLE_API_KEY configurada');
  }
});

// ============================================
// SERVIR FRONTEND (PARA UNIFICACIÓN EN DO)
// ============================================
const path = require('path');
const distPath = path.resolve(__dirname, '../dist');

console.log(`📂 Sirviendo archivos estáticos desde: ${distPath}`);

// Servir archivos estáticos desde la carpeta 'dist'
app.use(express.static(distPath));

// Cualquier ruta que no coincida con la API, sirve el index.html (para React Router)
app.get('*', (req, res) => {
  // Si es una petición a la API que no existe, dar 404 real
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Para el resto, servir el index.html del frontend
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error al enviar index.html:', err);
      res.status(500).send('Error cargando el frontend. Asegúrate de que "npm run build" se ejecutó correctamente.');
    }
  });
});
