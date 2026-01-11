require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de Supabase para verificar tokens
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bmnwfimrcblnvmkbflwn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbndmaW1yY2JsbnZta2JmbHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTc4NDQsImV4cCI6MjA4MzYzMzg0NH0.Xdeil2_IPMFjprhFG7yoIwshqIhntNNZ3Hc6jEj6KjM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración de Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appRMClMob8KPNooU';
const SERVICIOS_BASE_ID = process.env.AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
const REGISTROS_BASE_ID = process.env.AIRTABLE_REGISTROS_BASE_ID || 'applcT2fcdNDpCRQ0';

// CORS configurado para tu dominio
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: [CLIENT_URL, 'https://portal.ritest.es', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Rate Limiting - 100 peticiones por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Middleware de autenticación con Supabase
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado - Token requerido' });
    }

    const token = authHeader.substring(7);
    
    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Añadir usuario al request para usarlo después
    req.user = user;
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    res.status(401).json({ error: 'Error de autenticación' });
  }
}

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

// Health check (sin autenticación)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    authenticated: false
  });
});

// Endpoint de prueba de autenticación
app.get('/api/auth/check', authenticateUser, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.user_metadata?.role
    }
  });
});

// Endpoint de login - SIN autenticación (permite login inicial)
app.get('/api/servicios/Trabajadores', async (req, res) => {
  try {
    const client = createAirtableClient(SERVICIOS_BASE_ID);
    const config = {
      method: 'GET',
      url: '/Trabajadores',
      params: req.query
    };

    const response = await client.request(config);
    res.json(response.data);
  } catch (error) {
    console.error('Error en login Trabajadores:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Proxy para base principal de Airtable - CON AUTENTICACIÓN
app.all('/api/airtable/:tableName*', authenticateUser, async (req, res) => {
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

// Proxy para base de servicios - CON AUTENTICACIÓN
app.all('/api/servicios/:tableName*', authenticateUser, async (req, res) => {
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

// Proxy para base de registros - CON AUTENTICACIÓN
app.all('/api/registros/:tableName*', authenticateUser, async (req, res) => {
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
  console.error('Error global:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend seguro ejecutándose en puerto ${PORT}`);
  console.log(`🔒 Autenticación: Activada (Supabase JWT)`);
  console.log(`⏱️  Rate Limiting: 100 req/15min`);
  console.log(`🌐 CORS: ${CLIENT_URL}`);
  if (!AIRTABLE_API_KEY) {
    console.error('⚠️  ADVERTENCIA: AIRTABLE_API_KEY no configurada');
  }
});
