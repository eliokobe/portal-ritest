require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const compression = require('compression');
const NodeCache = require('node-cache');

const app = express();
const PORT = 3001;

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
app.post('/api/upload-attachment', async (req, res) => {
  try {
    const { baseId, recordId, fieldName, file } = req.body;
    
    if (!baseId || !recordId || !fieldName || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`📤 Uploading attachment directly to Airtable Content API: ${baseId}/${recordId}/${fieldName}`);
    
    // Usar el endpoint de contenido de Airtable (soporta hasta 5MB directos)
    // Documentación: https://content.airtable.com/v0/{baseId}/{recordId}/{fieldName}/uploadAttachment
    const response = await axios.post(
      `https://content.airtable.com/v0/${baseId}/${recordId}/${fieldName}/uploadAttachment`,
      {
        contentType: file.contentType,
        file: file.data, // Airtable espera el base64 aquí según la documentación que enviaste
        filename: file.filename
      },
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        // Aumentar el timeout para archivos grandes
        timeout: 60000
      }
    );
    
    console.log('✅ Attachment uploaded successfully');
    
    // Invalidar la caché para que al recargar se vean los cambios
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
});

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
  console.log(`🚀 Servidor backend ejecutándose en puerto ${PORT}`);
  console.log(`🌐 CORS: ${CLIENT_URL}`);
  if (!AIRTABLE_API_KEY) {
    console.error('⚠️  ADVERTENCIA: AIRTABLE_API_KEY no configurada');
  } else {
    console.log('✅ AIRTABLE_API_KEY configurada');
  }
});
