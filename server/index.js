require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const SERVICIOS_BASE_ID = process.env.AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
const REGISTROS_BASE_ID = process.env.AIRTABLE_REGISTROS_BASE_ID || 'applcT2fcdNDpCRQ0';

// CORS configurado para tu dominio
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [CLIENT_URL, 'https://portal.ritest.es', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

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
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// PROXY SERVICIOS (sin autenticación JWT)
// ============================================
app.all('/api/servicios/:tableName*', async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    
    console.log(`📡 Proxy Servicios: ${req.method} /${tableName}${path}`);
    
    const config = {
      method: req.method,
      url: `/${tableName}${path}`,
      params: req.query,
      data: req.body
    };

    const response = await client.request(config);
    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Servicios:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.all('/servicios/:tableName*', async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    
    console.log(`📡 Proxy Servicios: ${req.method} /${tableName}${path}`);
    
    const config = {
      method: req.method,
      url: `/${tableName}${path}`,
      params: req.query,
      data: req.body
    };

    const response = await client.request(config);
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
app.all('/api/registros/:tableName*', async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(REGISTROS_BASE_ID);
    
    console.log(`📡 Proxy Registros: ${req.method} /${tableName}${path}`);
    
    const config = {
      method: req.method,
      url: `/${tableName}${path}`,
      params: req.query,
      data: req.body
    };

    const response = await client.request(config);
    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Registros:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

app.all('/registros/:tableName*', async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(REGISTROS_BASE_ID);
    
    console.log(`📡 Proxy Registros: ${req.method} /${tableName}${path}`);
    
    const config = {
      method: req.method,
      url: `/${tableName}${path}`,
      params: req.query,
      data: req.body
    };

    const response = await client.request(config);
    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Registros:', error.response?.data || error.message);
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
