import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Configuración de Airtable desde variables de entorno del servidor
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appRMClMob8KPNooU';
const SERVICIOS_BASE_ID = process.env.AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
const REGISTROS_BASE_ID = process.env.AIRTABLE_REGISTROS_BASE_ID || 'applcT2fcdNDpCRQ0';

if (!AIRTABLE_API_KEY) {
  console.error('⚠️  AIRTABLE_API_KEY no está configurada');
}

// Crear instancias de axios para Airtable
const createAirtableClient = (baseId) => {
  return axios.create({
    baseURL: `https://api.airtable.com/v0/${baseId}`,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000
  });
};

// Middleware para validar que la API key esté configurada
const validateApiKey = (req, res, next) => {
  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ 
      error: 'Airtable API key no configurada en el servidor' 
    });
  }
  next();
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoints para Airtable - Base principal
app.all('/api/airtable/:tableName*', validateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(AIRTABLE_BASE_ID);
    
    const config = {
      method: req.method,
      url: `/${tableName}${path}`,
      params: req.query,
      data: req.body
    };

    const response = await client.request(config);
    res.json(response.data);
  } catch (error) {
    console.error('Error en proxy Airtable:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Proxy endpoints para Airtable - Base de servicios
app.all('/api/servicios/:tableName*', validateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    
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

// Proxy endpoints para Airtable - Base de registros
app.all('/api/registros/:tableName*', validateApiKey, async (req, res) => {
  try {
    const { tableName } = req.params;
    const path = req.params[0] || '';
    const client = createAirtableClient(REGISTROS_BASE_ID);
    
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
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend iniciado en puerto ${PORT}`);
  console.log(`🔒 API Key de Airtable: ${AIRTABLE_API_KEY ? 'Configurada ✓' : 'No configurada ✗'}`);
});
