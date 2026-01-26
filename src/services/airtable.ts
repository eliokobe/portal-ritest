/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { User, DashboardStats } from '../types';
import { supabaseService } from './supabase';

// Backend URL - todas las peticiones van al backend seguro
// En desarrollo usamos el proxy de Vite o URL absoluta, en producción relativa
const BACKEND_URL = import.meta.env.DEV ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001') : '';

// Nombres de tablas
const AIRTABLE_WORKERS_TABLE = import.meta.env.VITE_AIRTABLE_WORKERS_TABLE || 'Trabajadores';
const AIRTABLE_SERVICES_TABLE = import.meta.env.VITE_AIRTABLE_SERVICES_TABLE || 'Servicios';
const AIRTABLE_ENVIOS_TABLE = import.meta.env.VITE_AIRTABLE_ENVIOS_TABLE || 'Envíos';

console.log('- Autenticación: Airtable (tabla Trabajadores)');

// Función para obtener el token de autenticación
async function getAuthToken(): Promise<string | null> {
  try {
    if (!supabaseService.supabase) {

      return null;
    }
    const { data, error } = await supabaseService.supabase.auth.getSession();
    if (error) {

      return null;
    }
    return data.session?.access_token || null;
  } catch (error) {

    return null;
  }
}

// Cliente para peticiones a la base principal (via backend)
const airtableApi = axios.create({
  baseURL: `${BACKEND_URL}/api/airtable`,
  timeout: 30000,
});

// Cliente para peticiones a la base de servicios (via backend)
const serviciosApi = axios.create({
  baseURL: `${BACKEND_URL}/api/servicios`,
  timeout: 30000,
});

// Helper para convertir peticiones GET con filtros a POST (para ocultar filterByFormula del Network tab)
function convertToSecurePost(config: any) {
  if (config.method === 'get' && config.params) {
    // Si tiene filterByFormula u otros parámetros sensibles, convertir a POST
    const hasFilterFormula = config.params.filterByFormula;
    
    if (hasFilterFormula) {
      return {
        ...config,
        method: 'post',
        data: {
          filterParams: config.params,
        },
        params: {}, // Limpiar params de la URL
      };
    }
  }
  return config;
}

// Interceptor para añadir token de autenticación a todas las peticiones
airtableApi.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Convertir a POST seguro si tiene filtros
  return convertToSecurePost(config);
});

serviciosApi.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Convertir a POST seguro si tiene filtros
  return convertToSecurePost(config);
});

type ServiciosFieldSample = {
  names: Set<string>;
  sampleFields: Record<string, unknown>;
};

const serviciosFieldSampleCache: Record<string, ServiciosFieldSample> = {};

async function inferServiciosFieldSample(tableName: string): Promise<ServiciosFieldSample> {
  if (serviciosFieldSampleCache[tableName]) return serviciosFieldSampleCache[tableName];
  try {
    const { data } = await serviciosApi.get(`/${tableName}`, { params: { pageSize: 1 } });
    const record = (data as any)?.records?.[0];
    const fields = (record as any)?.fields ?? {};
    const names = new Set(Object.keys(fields));
    serviciosFieldSampleCache[tableName] = { names, sampleFields: fields };
    return serviciosFieldSampleCache[tableName];
  } catch (error) {

    serviciosFieldSampleCache[tableName] = { names: new Set<string>(), sampleFields: {} };
    return serviciosFieldSampleCache[tableName];
  }
}

// Cliente para peticiones a la base de registros (via backend)
const registrosApi = axios.create({
  baseURL: `${BACKEND_URL}/api/registros`,
  timeout: 30000,
});

// Interceptor para añadir token de autenticación
registrosApi.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Convertir a POST seguro si tiene filtros
  return convertToSecurePost(config);
});

// Helper para escapar strings en fórmulas de Airtable
const escapeFormulaString = (value: unknown) => String(value ?? '').replace(/'/g, "\\'");

// Helper para paginar Airtable de la segunda base (Registros)
async function fetchAllRegistros(table: string, params: Record<string, any> = {}) {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const { data } = await registrosApi.get(`/${table}`, { params: { ...params, offset } });
    const airtableData = data as { records?: any[]; offset?: string };
    all.push(...(airtableData.records ?? []));
    offset = airtableData.offset;
  } while (offset);
  return all;
}

// Helper para paginar Airtable de la base específica de servicios
async function fetchAllServicios(table: string, params: Record<string, any> = {}) {
  const all: any[] = [];
  let offset: string | undefined;
  try {
    do {
      const { data } = await serviciosApi.get(`/${table}`, { params: { ...params, offset } });
      const airtableData = data as { records?: any[]; offset?: string };
      all.push(...(airtableData.records ?? []));
      offset = airtableData.offset;
    } while (offset);
  } catch (error: any) {

    throw error;
  }
  return all;
}

type ServicioListado = {
  id: string;
  expediente?: string;
  nombre?: string;
  cliente?: string;
  telefono?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  provincia?: string;
  estado?: string;
  estadoIpas?: string;
  estadoEnvio?: string;
  descripcion?: string;
  comentarios?: string;
  motivoCancelacion?: string;
  cita?: string;
  tecnico?: string;
  trabajadorId?: string[];
  formularioId?: string[];
  reparacionesId?: string[];
  notaTecnico?: string;
  citaTecnico?: string;
  fechaRegistro?: string;
  ultimoCambio?: string;
  chatbot?: string;
  fechaInstalacion?: string;
  referencia?: string;
  conversationId?: string;
  tramitado?: boolean;
  numeroSerie?: string;
  importe?: number;
  accionIpartner?: string;
  ipartner?: string;
  seguimiento?: string;
  resolucionVisita?: string;
  requiereAccion?: string;
  numero?: string;
};

const mapFormularioRecord = (r: any) => {
  const f = r.fields ?? {};
  return {
    id: r.id,
    _recordId: r.id,
    Expediente: f['Expediente'],
    Detalles: f['Detalles'] ?? f['Details'] ?? f['Descripción'],
    'Potencia contratada': f['Potencia contratada'] ?? f['Contracted Power'],
    'Fecha instalación': f['Fecha instalación'] ?? f['Installation Date'],
    'Archivo 1': f['Archivo 1'] ?? f['File 1'],
    'Archivo 2': f['Archivo 2'] ?? f['File 2'],
    'Archivo 3': f['Archivo 3'] ?? f['File 3'],
    'Foto general': f['Foto general'] ?? f['General Photo'],
    'Foto etiqueta': f['Foto etiqueta'] ?? f['Label Photo'],
    'Foto roto': f['Foto roto'] ?? f['Broken Photo'],
    'Foto cuadro': f['Foto cuadro'] ?? f['Panel Photo'],
    Nombre: f['Nombre'] ?? f['Cliente'],
    Dirección: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
  };
};

async function fetchServicesByTable(params: {
  tableName: string;
  clinic?: string;
  workerId?: string;
  workerEmail?: string;
  onlyUnsynced?: boolean;
  view?: string;
}): Promise<ServicioListado[]> {
  const { tableName, clinic, workerId, workerEmail, onlyUnsynced, view } = params;
  try {
    const queryParams: Record<string, any> = {};

    const { names: serviciosFieldNames, sampleFields } = await inferServiciosFieldSample(tableName);

    const pickExistingField = (candidates: string[]) => candidates.find((c) => serviciosFieldNames.has(c));
    const isArrayField = (fieldName: string) => Array.isArray((sampleFields as any)?.[fieldName]);

    const formulaParts: string[] = [];

    if (clinic) {
      const clinicEsc = escapeFormulaString(clinic);
      const clinicFieldCandidates = ['Empresa', 'Clinic', 'Cliente'];
      const existingClinicFields = clinicFieldCandidates.filter((f) => serviciosFieldNames.has(f));

      if (existingClinicFields.length > 0) {
        const ors = existingClinicFields.map((f) => `{${f}} = '${clinicEsc}'`).join(', ');
        formulaParts.push(existingClinicFields.length === 1 ? ors : `OR(${ors})`);
      }
    }

    if (workerEmail) {
      const emailEsc = escapeFormulaString(workerEmail);
      // Forzar el uso de "Email trabajador" (lookup field, siempre es array)
      const emailField = 'Email trabajador';


      // Email trabajador es un lookup, por lo tanto es un array
      // Igualdad exacta en el array convertido a string
      formulaParts.push(`ARRAYJOIN({${emailField}}, ',') = '${emailEsc}'`);

    } else if (workerId) {
      const workerIdEsc = escapeFormulaString(workerId);
      const workerField = pickExistingField([
        'Trabajador',
        'Trabajadores',
        'Worker',
        'Workers',
      ]);

      if (workerField) {
        if (isArrayField(workerField)) {
          formulaParts.push(`FIND('${workerIdEsc}', ARRAYJOIN({${workerField}}, ','))`);
        } else {
          formulaParts.push(`FIND('${workerIdEsc}', {${workerField}})`);
        }
      } else {

      }
    }

    if (onlyUnsynced) {
      // Para tramitaciones usamos campo "Tramitado" (checkbox) pendiente
      if (serviciosFieldNames.has('Tramitado')) {
        formulaParts.push('OR({Tramitado}=BLANK(), {Tramitado}=FALSE())');
      }
    }

    if (view) {
      queryParams.view = view;
    }

    if (formulaParts.length > 0) {
      queryParams.filterByFormula = formulaParts.length === 1 ? formulaParts[0] : `AND(${formulaParts.join(', ')})`;
    }


    let records: any[] = [];
    try {
      records = await fetchAllServicios(tableName, { ...queryParams, pageSize: 100 });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`La tabla "${tableName}" no se encuentra. Verifica el nombre en Airtable.`);
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('Error de autenticación con Airtable. Verifica tu API key y permisos.');
      }
      if (error.response?.status === 422) {
        const airtableMsg = error.response?.data?.error?.message;
        throw new Error(`Error en filtros de Airtable (posibles columnas renombradas): ${airtableMsg ?? '422'}`);
      }
      throw error;
    }

    if (records.length === 0 && (workerId || workerEmail) && queryParams.filterByFormula) {
      try {
        records = await fetchAllServicios(tableName, { pageSize: 100 });
      } catch {
        // ignorar: devolveremos vacío
      }
    }

    const mappedRecords: ServicioListado[] = records.map((r: any) => {
      const f = r.fields ?? {};
      return {
        id: r.id,
        expediente: f['Expediente'] ?? f['Nº Expediente'] ?? f['Numero'] ?? f['Número'],
        nombre: f['Nombre'] ?? f['Cliente'],
        cliente: f['Cliente'] ?? f['Nombre'],
        telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Tel'],
        direccion: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
        poblacion: f['Población'] ?? f['Poblacion'],
        codigoPostal: f['Código postal'] ?? f['Codigo postal'] ?? f['CP'],
        provincia: f['Provincia'],
        estado: f['Estado'],
        estadoIpas: f['Estado Ipas'] ?? f['Estado IPAS'] ?? f['EstadoIpas'],
        estadoEnvio: f['Estado envío'] ?? f['Estado envio'] ?? f['Estado Envío'] ?? f['Estado Envio'],
        descripcion: f['Descripción'] ?? f['Descripcion'] ?? f['Description'],
        comentarios: f['Comentarios'],
        motivoCancelacion: f['Motivo cancelación'] ?? f['Motivo Cancelacion'] ?? f['Motivo cancelacion'],
        cita: f['Cita'],
        presupuesto: f['Presupuesto'],
        tecnico: f['Técnico'] ?? f['Tecnico'] ?? f['Technician'],
        trabajadorId: f['Trabajador'],
        formularioId: f['Formulario'],
        reparacionesId: f['Reparaciones'],
        notaTecnico: f['Nota técnico'] ?? f['Nota tecnico'] ?? f['Nota Técnico'] ?? f['Nota Tecnico'] ?? f['Observaciones técnico'],
        citaTecnico: f['Cita técnico'] ?? f['Cita tecnico'] ?? f['Cita Técnico'],
        fechaRegistro: f['Fecha de registro'] ?? f['Fecha'] ?? f['Created'] ?? r.createdTime,
        ultimoCambio: f['Último cambio'] ?? f['Ultima modificacion'] ?? f['Last Modified'] ?? f['Modified'] ?? r.createdTime,
        chatbot: f['Chatbot'],
        fechaInstalacion: f['Fecha instalación'] ?? f['Fecha instalacion'] ?? f['Installation Date'],
        referencia: f['Referencia'] ?? f['Reference'],
        conversationId: f['Conversation id'] ?? f['Conversation ID'] ?? f['ConversationId'],
        tramitado: f['Tramitado'] ?? false,
        numeroSerie: f['Número de serie'] ?? f['Numero de serie'] ?? f['S/N'] ?? f['# S/N'] ?? f['Nº Serie'] ?? f['SN'],
        importe: f['Importe'],
        accionIpartner: Array.isArray(f['Acción Ipartner'] ?? f['Accion Ipartner']) 
          ? (f['Acción Ipartner'] ?? f['Accion Ipartner']).join(', ') 
          : (f['Acción Ipartner'] ?? f['Accion Ipartner']),
        ipartner: f['Ipartner'],
        seguimiento: f['Seguimiento'],
        resolucionVisita: f['Resolución visita'] ?? f['Resolucion visita'],
        requiereAccion: f['Requiere acción'],
        motivoTecnico: f['Motivo técnico'] ?? f['Motivo tecnico'],
        numero: f['Número'] ?? f['Numero'],
      };
    });


    return mappedRecords;
  } catch (error) {

    return [];
  }
}



export const airtableService = {
  // Obtener catálogo (linked records) tabla "Catálogo"
  async getCatalogos(): Promise<{ id: string; nombre: string; categoria?: string }[]> {
    try {
      const records = await fetchAllServicios('Catálogo', { pageSize: 100, view: 'Portal' });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          nombre: f['Nombre'] ?? 'Sin nombre',
          categoria: f['Categoría'] ?? f['Categoria'],
        };
      });
    } catch (error) {

      return [];
    }
  },

  async getPresupuestoOptions(): Promise<string[]> {
    try {
      const response = await serviciosApi.get('/presupuesto-options');
      return response.data?.options || [];
    } catch (error) {
      console.error('Error al cargar opciones de presupuesto:', error);
      throw error;
    }
  },

  // Autenticación
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const response = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}`, {
        params: {
          filterByFormula: `AND({Email corporativo} = '${email}', {Contraseña} = '${password}')`,
        },
      });

      const data = response.data as { records: any[] };

      if (data.records.length > 0) {
        const record = data.records[0];

        const logoField = record.fields.Logo;
        let logoUrl: string | undefined;
        if (Array.isArray(logoField) && logoField.length > 0) {
          const first = logoField[0];
          logoUrl = (first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.full?.url) as string | undefined;
        }
        

        return {
          id: record.id,
          email: record.fields['Email corporativo'] || record.fields.Email,
          name: record.fields.Nombre || record.fields.Name,
          phone: record.fields.Teléfono || record.fields.Phone,
          clinic: record.fields.Empresa || record.fields.Clinic,
          role: record.fields.Puesto || record.fields.Rol || record.fields.Cargo || record.fields.Role,
          logoUrl,
        };
      }
      return null;
    } catch (error) {

      return null;
    }
  },

  // Obtener usuario por ID (para restaurar sesión)
  async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}/${userId}`);
      const record = response.data;

      if (record) {
        const logoField = record.fields.Logo;
        let logoUrl: string | undefined;
        if (Array.isArray(logoField) && logoField.length > 0) {
          const first = logoField[0];
          logoUrl = (first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.full?.url) as string | undefined;
        }

        return {
          id: record.id,
          email: record.fields['Email corporativo'] || record.fields.Email,
          name: record.fields.Nombre || record.fields.Name,
          phone: record.fields.Teléfono || record.fields.Phone,
          clinic: record.fields.Empresa || record.fields.Clinic,
          role: record.fields.Puesto || record.fields.Rol || record.fields.Cargo || record.fields.Role,
          logoUrl,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  },

  // Obtener todos los trabajadores (para Responsable)
  async getWorkers(): Promise<{ id: string; nombre: string; email: string; rol: string }[]> {
    try {
      const response = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}`, {
        params: {
          fields: ['Nombre', 'Email corporativo', 'Puesto'],
          filterByFormula: "AND({Email corporativo} != '', {Puesto} != '')",
        },
      });

      const data = response.data as { records: any[] };
      return data.records.map((record) => ({
        id: record.id,
        nombre: record.fields.Nombre || '',
        email: record.fields['Email corporativo'] || '',
        rol: record.fields.Puesto || '',
      }));
    } catch (error) {

      return [];
    }
  },

  // Obtener URL del logo del trabajador por ID
  async getClientLogo(workerId: string): Promise<string | undefined> {
    try {
      const { data } = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}/${workerId}`);
      const fields = (data as any)?.fields ?? {};
      const logoField = fields.Logo;
      if (Array.isArray(logoField) && logoField.length > 0 && logoField[0]?.url) {
        return logoField[0].url as string;
      }
      return undefined;
    } catch (error) {

      return undefined;
    }
  },

  // Obtener estadísticas del dashboard para Técnico
  async getTechnicianDashboardStats(userId?: string, userEmail?: string): Promise<{
    assignedByDay: { date: string; count: number }[];
    resolvedByDay: { date: string; count: number }[];
    clientesPendientes: number;
    clientesResueltosHoy: number;
    promedioResolucionRemotaMes: number;
    promedioVelocidadResolucionMes: number;
  }> {
    try {
      const records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, { pageSize: 100 });
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Festivos de la Comunidad de Madrid 2026
      const madridHolidays2026 = new Set([
        '2026-01-01', // Año Nuevo
        '2026-01-06', // Reyes Magos
        '2026-04-03', // Viernes Santo
        '2026-04-06', // Lunes de Pascua (no oficial en Madrid pero lo incluyo)
        '2026-05-01', // Fiesta del Trabajo
        '2026-05-02', // Fiesta de la Comunidad de Madrid
        '2026-05-15', // San Isidro (patrón de Madrid)
        '2026-08-15', // Asunción de la Virgen
        '2026-10-12', // Fiesta Nacional de España
        '2026-11-09', // Nuestra Señora de la Almudena (patrona de Madrid)
        '2026-12-07', // Día de la Constitución (se traslada al lunes 7)
        '2026-12-08', // Inmaculada Concepción
        '2026-12-25', // Navidad
      ]);
      
      // Preparar mapa de días (últimos 14 días, solo días laborables: lunes a viernes, sin festivos)
      const dayKey = (d: Date) => d.toISOString().split('T')[0];
      const last14Keys: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
        const key = dayKey(d);
        // Solo agregar si es día laborable (lunes=1 a viernes=5) y no es festivo
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !madridHolidays2026.has(key)) {
          last14Keys.push(key);
        }
      }
      const assignedMap = new Map(last14Keys.map(k => [k, 0]));
      const resolvedMap = new Map(last14Keys.map(k => [k, 0]));
      

      
      // Variables para las nuevas métricas
      let clientesPendientes = 0;
      let clientesResueltosHoy = 0;
      let resolucionesRemotasMes = 0;
      let resolucionesTotalesMes = 0;
      let tiempoTotalResolucionMes = 0;
      let contadorResolucionesMes = 0;
      
      let serviciosFinalizados = 0;
      let serviciosFinalizadosTecnico = 0;
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const fechaRegistro = f['Fecha de registro'];
        const fechaCierre = f['Fecha cierre'];
        const estado = f['Estado'];
        const tecnico = f['Técnico'];
        const emailTrabajador = f['Email trabajador'];
        const tipoServicio = f['Tipo de servicio'];
        
        // DEBUG: Contar finalizados
        if (estado === 'Finalizado') {
          serviciosFinalizados++;
          const isTecnicoEmpty = !tecnico || 
            (typeof tecnico === 'string' && tecnico.trim() === '') || 
            (Array.isArray(tecnico) && tecnico.length === 0);
          if (isTecnicoEmpty) {
            serviciosFinalizadosTecnico++;
          }
        }
        
        // Verificar si el servicio pertenece al técnico
        let belongsToTechnician = false;
        if (userEmail && emailTrabajador) {
          if (typeof emailTrabajador === 'string') {
            belongsToTechnician = emailTrabajador.includes(userEmail);
          } else if (Array.isArray(emailTrabajador)) {
            belongsToTechnician = emailTrabajador.some((email: string) => email && email.includes(userEmail));
          }
        }
        
        // Servicios asignados (últimas 2 semanas por fecha de registro, donde Email trabajador contiene el email del usuario)
        if (fechaRegistro) {
          const regDate = new Date(fechaRegistro);
          
          if (belongsToTechnician && regDate >= fourteenDaysAgo && regDate <= now) {
            const key = dayKey(regDate);
            if (assignedMap.has(key)) {
              assignedMap.set(key, assignedMap.get(key)! + 1);
            }
          }
        }
        
        // Verificar que Técnico esté vacío
        const isTecnicoEmpty = !tecnico || 
          (typeof tecnico === 'string' && tecnico.trim() === '') || 
          (Array.isArray(tecnico) && tecnico.length === 0);
        
        // Incidencias resueltas: Estado = Finalizado, Técnico vacío, Email trabajador contiene el email del usuario, últimas 2 semanas
        if (estado === 'Finalizado' && fechaCierre) {
          const resDate = new Date(fechaCierre);
          
          // Solo contar si cumple todas las condiciones Y está en el rango de 2 semanas
          if (isTecnicoEmpty && belongsToTechnician && resDate >= fourteenDaysAgo && resDate <= now) {
            const key = dayKey(resDate);
            if (resolvedMap.has(key)) {
              resolvedMap.set(key, resolvedMap.get(key)! + 1);
            }
          }
          
          // Clientes resueltos hoy
          if (isTecnicoEmpty && belongsToTechnician && resDate >= todayStart && resDate <= now) {
            clientesResueltosHoy++;
          }
          
          // Resoluciones este mes para calcular promedios
          if (isTecnicoEmpty && belongsToTechnician && resDate >= monthStart && resDate <= now) {
            resolucionesTotalesMes++;
            
            // Verificar si es resolución remota
            if (tipoServicio === 'Remoto' || tipoServicio === 'remoto') {
              resolucionesRemotasMes++;
            }
            
            // Calcular tiempo de resolución en horas
            const fechaResolucionInicio = f['Requiere acción'] || fechaRegistro;
            if (fechaResolucionInicio) {
              const registroDate = new Date(fechaResolucionInicio);
              const tiempoResolucion = (resDate.getTime() - registroDate.getTime()) / (1000 * 60 * 60); // en horas
              tiempoTotalResolucionMes += tiempoResolucion;
              contadorResolucionesMes++;
            }
          }
        }
        
        // Clientes pendientes: servicios que requieren acción (misma lógica que tab "requiere-accion" para Técnico)
        if (belongsToTechnician && estado) {
          const cita = f['Cita'] ? new Date(f['Cita']) : null;
          const citaTecnico = f['Cita técnico'] ? new Date(f['Cita técnico']) : null;
          const estadoEnvio = f['Estado envío'];
          
          const isCitaInterna = estado === 'Citado' && cita;
          const isCitaTecnico = estado === 'Citado' && citaTecnico;
          
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const isUltimoCambioOld = fechaCierre && new Date(fechaCierre) < twentyFourHoursAgo;
          
          // Estados que siempre requieren acción
          const estadosActivos = ['Sin contactar', 'Llamado', 'Pendiente de presupuesto', 'Pendiente de asignar', 'Formulario completado', 'Pendiente técnico', 'Pendiente de material', 'Presupuesto enviado'];
          if (estadosActivos.includes(estado)) {
            clientesPendientes++;
          } else if (estado === 'Contactado' && isUltimoCambioOld) {
            clientesPendientes++;
          } else if (estado === 'Pendiente de aceptación' && isUltimoCambioOld) {
            clientesPendientes++;
          } else if (estado === 'Aceptado' && isUltimoCambioOld) {
            clientesPendientes++;
          } else if (estado === 'Material enviado' && estadoEnvio === 'Entregado') {
            clientesPendientes++;
          } else if (isCitaInterna && cita) {
            if (cita <= now) clientesPendientes++;
          } else if (isCitaTecnico && citaTecnico) {
            if (citaTecnico <= now) clientesPendientes++;
          }
        }
      });
      
      const assignedByDay = last14Keys.map(k => ({ date: k, count: assignedMap.get(k)! }));
      const resolvedByDay = last14Keys.map(k => ({ date: k, count: resolvedMap.get(k)! }));
      
      // Calcular promedio de resolución remota del mes actual (media de las semanas del mes)
      let promedioResolucionRemotaMes = 0;
      try {
        const remoteResolutionData = await this.getTechnicianRemoteResolutionByWeek(userId, userEmail);
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Filtrar solo semanas del mes actual
        const weeklyDataThisMonth = remoteResolutionData.weeklyData.filter(week => {
          const [year, month] = week.week.split('-').map(Number);
          return year === currentYear && month === currentMonth + 1; // +1 porque getMonth() devuelve 0-11
        });
        
        // Calcular media de los porcentajes semanales
        if (weeklyDataThisMonth.length > 0) {
          const sumPercentages = weeklyDataThisMonth.reduce((sum, week) => sum + week.remotePercentage, 0);
          promedioResolucionRemotaMes = Math.round(sumPercentages / weeklyDataThisMonth.length);
        }
      } catch (error) {

      }
      
      // Calcular velocidad de resolución del mes actual desde Supabase
      let promedioVelocidadResolucionMes = 0;
      try {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const resolutionRecords = await supabaseService.getResolutionRecordsByMonth(monthStart);
        
        if (resolutionRecords.length > 0) {
          let totalHours = 0;
          let count = 0;
          
          resolutionRecords.forEach(record => {
            // Usar duracion_decimal si existe, sino calcular la diferencia
            if (record.duracion_decimal !== undefined && record.duracion_decimal !== null) {
              totalHours += record.duracion_decimal;
              count++;
            } else {
              const creacion = new Date(record.creación);
              const resolucion = new Date(record.resolución);
              const hours = (resolucion.getTime() - creacion.getTime()) / (1000 * 60 * 60);
              totalHours += hours;
              count++;
            }
          });
          
          if (count > 0) {
            promedioVelocidadResolucionMes = Math.round(totalHours / count);
          }
        }
      } catch (error) {

      }
      










      return { 
        assignedByDay, 
        resolvedByDay,
        clientesPendientes,
        clientesResueltosHoy,
        promedioResolucionRemotaMes,
        promedioVelocidadResolucionMes,
      };
    } catch (error) {

      const now = new Date();
      const last14Keys: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last14Keys.push(d.toISOString().split('T')[0]);
      }
      return {
        assignedByDay: last14Keys.map(k => ({ date: k, count: 0 })),
        resolvedByDay: last14Keys.map(k => ({ date: k, count: 0 })),
        clientesPendientes: 0,
        clientesResueltosHoy: 0,
        promedioResolucionRemotaMes: 0,
        promedioVelocidadResolucionMes: 0,
      };
    }
  },

  // Obtener porcentaje de resolución remota por semana para Técnico
  async getTechnicianRemoteResolutionByWeek(_userId?: string, userEmail?: string): Promise<{
    weeklyData: { week: string; remotePercentage: number; totalServices: number }[];
  }> {
    try {
      const records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, { pageSize: 100 });
      const now = new Date();
      
      // Función para obtener el inicio de la semana (lunes)
      const getWeekStart = (date: Date): string => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        
        // Generar fecha en formato YYYY-MM-DD sin zona horaria
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const dayStr = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      };
      
      // Primera semana completa de 2026: lunes 5 de enero
      const firstMonday2026 = new Date('2026-01-05T00:00:00');
      
      // Generar semanas desde la primera semana completa hasta ahora
      const weekKeys: string[] = [];
      let currentMonday = new Date(firstMonday2026);
      
      while (currentMonday <= now) {
        // Generar fecha en formato YYYY-MM-DD sin zona horaria
        const year = currentMonday.getFullYear();
        const month = String(currentMonday.getMonth() + 1).padStart(2, '0');
        const day = String(currentMonday.getDate()).padStart(2, '0');
        weekKeys.push(`${year}-${month}-${day}`);
        
        // Avanzar a la siguiente semana (7 días)
        currentMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      
      // Mapas para contar servicios por semana
      const weekDataMap = new Map(weekKeys.map(k => [k, { remote: 0, presential: 0 }]));
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const fechaCierre = f['Fecha cierre']; // Fecha de cierre cuando se finaliza
        const estado = f['Estado'];
        const tecnico = f['Técnico'];
        const emailTrabajador = f['Email trabajador'];
        
        // Verificar si el servicio pertenece al técnico
        let belongsToTechnician = false;
        if (userEmail && emailTrabajador) {
          if (typeof emailTrabajador === 'string') {
            belongsToTechnician = emailTrabajador.includes(userEmail);
          } else if (Array.isArray(emailTrabajador)) {
            belongsToTechnician = emailTrabajador.some((email: string) => email && email.includes(userEmail));
          }
        }
        
        // FILTROS APLICADOS:
        // 1. Solo servicios del técnico (belongsToTechnician)
        // 2. Estado = 'Finalizado'
        // 3. Fecha cierre >= 5 enero 2026
        // 4. Fecha dentro del rango hasta ahora
        
        if (belongsToTechnician && estado === 'Finalizado' && fechaCierre) {
          const cierreDate = new Date(fechaCierre);
          
          // Primera semana completa: lunes 5 de enero de 2026
          // No contar fechas anteriores al 5 de enero
          if (cierreDate >= firstMonday2026 && cierreDate <= now) {
            const weekStart = getWeekStart(cierreDate);
            
            // Verificar que la semana esté en nuestro rango (desde el 5 de enero)
            if (weekDataMap.has(weekStart)) {
              const data = weekDataMap.get(weekStart)!;
              
              // Si Técnico está vacío = Remoto, si tiene valor = Presencial
              const isTecnicoEmpty = !tecnico || 
                (typeof tecnico === 'string' && tecnico.trim() === '') || 
                (Array.isArray(tecnico) && tecnico.length === 0);
              
              if (isTecnicoEmpty) {
                data.remote++;
              } else {
                data.presential++;
              }
            }
          }
        }
      });
      
      // Calcular porcentajes por semana
      const weeklyData = weekKeys.map(weekStart => {
        const data = weekDataMap.get(weekStart)!;
        const totalServices = data.remote + data.presential;
        const remotePercentage = totalServices > 0 
          ? Math.round((data.remote / totalServices) * 100) 
          : 0;
        
        return {
          week: weekStart,
          remotePercentage,
          totalServices,
        };
      });
      
      console.log('Weekly remote resolution data (desde 2026, solo días laborables):', weeklyData);
      
      return { weeklyData };
    } catch (error) {

      const now = new Date();
      const weekKeys: string[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const d = new Date(weekDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        weekKeys.push(monday.toISOString().split('T')[0]);
      }
      return {
        weeklyData: weekKeys.map(week => ({ week, remotePercentage: 0, totalServices: 0 })),
      };
    }
  },

  // Obtener estadísticas del dashboard para Administrativa (sincronización)
  async getAdminDashboardStats(): Promise<{
    unsynchronizedCount: number;
    synchronizedTodayCount: number;
    enviosPendientesCount: number;
    reparacionesPendientesCount: number;
  }> {
    try {
      const enviosRecords = await fetchAllServicios(AIRTABLE_ENVIOS_TABLE, { pageSize: 100 });
      const reparacionesRecords = await fetchAllServicios('Reparaciones', { pageSize: 100 });
      
      // Obtener tramitaciones usando el mismo método que usa la página Tramitacion
      const allTramitaciones = await fetchServicesByTable({ 
        tableName: AIRTABLE_SERVICES_TABLE, 
        onlyUnsynced: true 
      });
      
      // Aplicar el mismo filtro que usa la página Services.tsx para tramitaciones
      const tramitacionesFiltradas = allTramitaciones.filter((s: any) => {
        // Asegurarse de que accionIpartner sea un string para evitar errores con .trim()
        const accionStr = typeof s.accionIpartner === 'string' ? s.accionIpartner : 
                         Array.isArray(s.accionIpartner) ? s.accionIpartner.join(', ') : 
                         String(s.accionIpartner || '');

        // Registros pendientes de tramitar
        const isPendiente = !s.tramitado &&
          accionStr.trim() !== '' &&
          s.ipartner !== 'Cancelado' && s.ipartner !== 'Facturado';
        
        return isPendiente;
      });
      
      const unsynchronizedCount = tramitacionesFiltradas.length;
      
      // Función para calcular horas laborables (excluyendo fines de semana)
      const calculateBusinessHours = (startDate: Date, endDate: Date): number => {
        let hours = 0;
        const current = new Date(startDate);
        
        while (current < endDate) {
          const dayOfWeek = current.getDay();
          // Solo contar si es día laboral (lunes=1 a viernes=5)
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            hours++;
          }
          current.setHours(current.getHours() + 1);
        }
        
        return hours;
      };
      
      // Contar envíos pendientes con los mismos filtros que la tabla Envíos
      const estadosExcluidos = ['Entregado', 'Devuelto', 'Recogida hecha'];
      const now = new Date();
      let enviosPendientesCount = 0;
      
      enviosRecords.forEach((r: any) => {
        const f = r.fields ?? {};
        const estado = f['Estado'];
        const seguimiento = f['Seguimiento'];
        const fechaEnvio = f['Fecha de envío'] ?? f['Fecha Envío'] ?? f['Fecha envio'];
        
        // Excluir estados finalizados
        if (estado && estadosExcluidos.includes(estado)) return;
        
        // Excluir si tiene seguimiento "Email enviado"
        if (seguimiento === 'Email enviado') return;
        
        // Filtrar por fecha de envío (más de 48 horas laborables)
        if (fechaEnvio) {
          const fechaEnvioDate = new Date(fechaEnvio);
          const businessHours = calculateBusinessHours(fechaEnvioDate, now);
          
          // Solo contar si han pasado más de 48 horas laborables
          if (businessHours > 48) {
            enviosPendientesCount++;
          }
        }
      });
      
      // Contar reparaciones pendientes con los mismos filtros que la página Reparaciones
      const allowedStates = ['Asignado', 'Aceptado', 'Citado'];
      const HOURS_48_IN_MS = 48 * 60 * 60 * 1000;
      
      let reparacionesPendientesCount = 0;
      reparacionesRecords.forEach((r: any) => {
        const f = r.fields ?? {};
        const estado = f['Estado'];
        const fechaEstado = f['Fecha estado'] ?? f['Fecha Estado'];
        const cita = f['Cita'];
        
        // Verificar estado válido
        if (!estado || !allowedStates.includes(estado)) return;
        
        // Excluir si tiene una cita futura
        if (cita) {
          const citaDate = new Date(cita);
          if (citaDate > now) return;
        }
        
        // Verificar que han pasado más de 48 horas desde fechaEstado (para rol Administrativa)
        if (!fechaEstado) return;
        
        const fechaEstadoDate = new Date(fechaEstado);
        const timeDiff = now.getTime() - fechaEstadoDate.getTime();
        
        if (timeDiff > HOURS_48_IN_MS) {
          reparacionesPendientesCount++;
        }
      });
      
      return {
        unsynchronizedCount,
        synchronizedTodayCount: 0, // Ya no se usa pero se mantiene por compatibilidad
        enviosPendientesCount,
        reparacionesPendientesCount,
      };
    } catch (error) {

      return {
        unsynchronizedCount: 0,
        synchronizedTodayCount: 0,
        enviosPendientesCount: 0,
        reparacionesPendientesCount: 0,
      };
    }
  },

  // Obtener estadísticas de tiempo de tramitación (en horas) por día
  async getTramitacionTimeStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    // Primero intentar obtener desde Supabase
    const supabaseStats = await supabaseService.getTramitacionStats();
    
    // Si Supabase tiene datos, usarlos
    if (supabaseStats.dailyData.length > 0) {

      return supabaseStats;
    }
    
    // Fallback: usar datos de Airtable (para compatibilidad con datos antiguos)

    try {
      const records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, { pageSize: 100 });
      
      // Agrupar por fecha de sincronización
      const groupedByDay: Record<string, { totalHours: number; count: number }> = {};
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const tramitado = f['Tramitado'];
        const fechaSincronizacion = f['Fecha sincronización'] ?? f['Fecha sincronizacion'];
        const fechaRegistro = f['Fecha de Registro'] ?? f['Fecha registro'] ?? f['Fecha de registro'];
        const ultimoCambio = f['Último cambio'] ?? f['Ultima modificacion'];
        
        // Para registros tramitados, usar Fecha sincronización si existe, sino Último cambio
        const fechaTramitacion = fechaSincronizacion || ultimoCambio;
        
        // Solo considerar registros tramitados con ambas fechas
        if (tramitado && fechaTramitacion && fechaRegistro) {
          const syncDate = new Date(fechaTramitacion);
          const registerDate = new Date(fechaRegistro);
          
          // Validar que las fechas sean válidas
          if (isNaN(syncDate.getTime()) || isNaN(registerDate.getTime())) {
            return;
          }
          
          // Calcular diferencia en horas
          const diffMs = syncDate.getTime() - registerDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          
          // Solo incluir si la diferencia es positiva y razonable (menos de 30 días)
          if (diffHours > 0 && diffHours < 720) {
            // Agrupar por día de sincronización
            const dayKey = syncDate.toISOString().split('T')[0];
            
            if (!groupedByDay[dayKey]) {
              groupedByDay[dayKey] = { totalHours: 0, count: 0 };
            }
            
            groupedByDay[dayKey].totalHours += diffHours;
            groupedByDay[dayKey].count++;
          }
        }
      });
      
      // Convertir a array y calcular promedios
      const dailyData = Object.entries(groupedByDay)
        .map(([date, data]) => ({
          date,
          avgHours: Math.round((data.totalHours / data.count) * 10) / 10, // Redondear a 1 decimal
          count: data.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-30); // Últimos 30 días
      
      return {
        dailyData,
      };
    } catch (error) {

      return {
        dailyData: [],
      };
    }
  },

  // Obtener estadísticas de tiempo de recogida (en horas) por día
  async getRecogidaTimeStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    // Intentar obtener desde Supabase

    const supabaseStats = await supabaseService.getRecogidaStats();
    

    // Si Supabase tiene datos, usarlos
    if (supabaseStats.dailyData.length > 0) {

      return supabaseStats;
    }
    
    // Si no hay datos en Supabase, retornar array vacío

    return { dailyData: [] };
  },

  // Obtener estadísticas de tiempo de asesoramientos (en horas) por día
  async getAsesoramientoTimeStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    // Intentar obtener desde Supabase

    const supabaseStats = await supabaseService.getAsesoramientoStats();
    

    // Si Supabase tiene datos, usarlos
    if (supabaseStats.dailyData.length > 0) {

      return supabaseStats;
    }
    
    // Si no hay datos en Supabase, retornar array vacío

    return { dailyData: [] };
  },

  // Obtener estadísticas del dashboard (desde tabla Servicios)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Traer TODOS los servicios sin filtros
      let records: any[] = [];
      try {
        records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, {
          pageSize: 100,
        });

      } catch (error) {

        // Retornar estadísticas vacías si no existe la tabla
        const emptyDailyData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          emptyDailyData.push({
            date: d.toISOString().split('T')[0],
            services: 0,
            completed: 0,
          });
        }
        return {
          services30Days: 0,
          services7Days: 0,
          servicesCompleted30Days: 0,
          servicesCompleted7Days: 0,
          dailyData: emptyDailyData,
        };
      }

      // Normalizar - usar múltiples posibles nombres para la fecha
      type ServiceRec = { fecha: Date; estado?: string };
      const services: ServiceRec[] = records
        .map((r: any) => {
          const fields = r.fields || {};
          const fechaValue = fields['Fecha de registro'] ||
                          fields.Fecha || 
                          fields['Fecha de creación'] || 
                          fields['Created'] || 
                          fields['Date'] ||
                          r.createdTime || // Fecha de creación del registro en Airtable
                          new Date().toISOString(); // fecha actual como fallback
          

          return {
            fecha: new Date(fechaValue),
            estado: fields.Estado || fields.Status,
          };
        })
        .filter((r: ServiceRec) => !isNaN(r.fecha.getTime())); // solo fechas válidas
      

      // Acumulados 30/7 días
      let services30Days = 0;
      let services7Days = 0;
      let servicesCompleted30Days = 0;
      let servicesCompleted7Days = 0;

      // Mapa por día (últimos 7 días) para gráficos
      const dayKey = (d: Date) => d.toISOString().split('T')[0];
      const last7Keys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last7Keys.push(dayKey(d));
      }
      const byDay = new Map(last7Keys.map(k => [k, { services: 0, completed: 0 }]));

      for (const rec of services) {
        const is30 = rec.fecha >= thirtyDaysAgo && rec.fecha <= now;
        const is7 = rec.fecha >= sevenDaysAgo && rec.fecha <= now;
        const isCompleted = rec.estado === 'Finalizado' || 
                           rec.estado?.toLowerCase().includes('completado') || 
                           rec.estado?.toLowerCase().includes('reparado') ||
                           rec.estado?.toLowerCase().includes('finished') ||
                           rec.estado?.toLowerCase().includes('done');

        if (is30) {
          services30Days++;
          if (isCompleted) servicesCompleted30Days++;
        }
        if (is7) {
          services7Days++;
          if (isCompleted) servicesCompleted7Days++;
          const k = dayKey(rec.fecha);
          if (byDay.has(k)) {
            const agg = byDay.get(k)!;
            agg.services += 1;
            if (isCompleted) agg.completed += 1;
          }
        }
      }

      const dailyData = last7Keys.map(k => ({
        date: k,
        services: byDay.get(k)!.services,
        completed: byDay.get(k)!.completed,
      }));

      return {
        services30Days,
        services7Days,
        servicesCompleted30Days,
        servicesCompleted7Days,
        dailyData,
      };
    } catch (error) {

      // En caso de error, retornar estadísticas vacías en lugar de fallar
      const emptyDailyData = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        emptyDailyData.push({
          date: d.toISOString().split('T')[0],
          services: 0,
          completed: 0,
        });
      }
      return {
        services30Days: 0,
        services7Days: 0,
        servicesCompleted30Days: 0,
        servicesCompleted7Days: 0,
        dailyData: emptyDailyData,
      };
    }
  },

  // Obtener inventario (tabla "Inventario")
  async getInventario(): Promise<{
    id: string;
    numeroSerie?: string;
    modelo?: string;
    observaciones?: string;
    ubicacion?: string;
    creado?: string;
  }[]> {
    try {
      const records = await fetchAllServicios('Inventario', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        const numeroSerie = f['S/N'] ?? f['# S/N'] ?? f['# Número de serie'] ?? f['Numero de serie'] ?? f['Número de serie'] ?? f['Nº Serie'] ?? f['Nº número de serie'] ?? f['SN'];

        return {
          id: r.id,
          numeroSerie,
          modelo: f['Modelo'] ?? f['Producto'],
          observaciones: f['Observaciones'],
          ubicacion: f['Ubicación'] ?? f['Ubicacion'],
          creado: f['Creado'] ?? r.createdTime,
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Obtener envíos (tabla "Envíos")
  async getEnvios(): Promise<{
    id: string;
    numero?: string;
    numeroRecogida?: number;
    seguimiento?: string;
    servicio?: string;
    estado?: string;
    fechaEnvio?: string;
    fechaEstado?: string;
    fechaSeguimiento?: string;
    material?: string;
    producto?: string;
    fechaCambio?: string;
    creacion?: string;
    transporte?: string;
    catalogo?: string;
    comentarios?: string;
    cliente?: string;
    direccion?: string;
    poblacion?: string;
    codigoPostal?: string;
    provincia?: string;
    telefono?: string;
    referencia?: string;
  }[]> {
    try {
      const records = await fetchAllServicios(AIRTABLE_ENVIOS_TABLE, { pageSize: 100, view: 'Portal' });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        const materialField = f['Inventario'];
        const servicioField = f['Servicio'];
        const catalogoField = f['Catálogo'] ?? f['Catalogo'];

        const numeroField = f['Número'] ?? f['Numero'];
        const numeroRecogidaField = f['Número de recogida'];
        const referenciaField = f['Referencia'] ?? f['Reference'];

        return {
          id: r.id,
          numero: numeroField !== undefined ? String(numeroField) : undefined,
          numeroRecogida: numeroRecogidaField !== undefined ? Number(numeroRecogidaField) : undefined,
          seguimiento: f['Seguimiento'],
          servicio: Array.isArray(servicioField) ? servicioField[0] : servicioField,
          estado: f['Estado'],
          fechaEnvio: f['Fecha de envío'] ?? f['Fecha Envío'] ?? f['Fecha envio'],
          fechaEstado: f['Fecha estado'] ?? f['Fecha Estado'],
          fechaSeguimiento: f['Fecha seguimiento'] ?? f['Fecha Seguimiento'],
          material: Array.isArray(materialField) ? materialField[0] : materialField,
          producto: f['Producto'] ?? f['Modelo'],
          fechaCambio: f['Fecha Cambio'] ?? f['Last Modified'] ?? r.createdTime,
          creacion: f['Creación'] ?? f['Creacion'] ?? r.createdTime,
          transporte: f['Transporte'],
          catalogo: Array.isArray(catalogoField) ? catalogoField[0] : catalogoField,
          comentarios: f['Comentarios'],
          cliente: f['Cliente'],
          direccion: f['Dirección'] ?? f['Direccion'],
          poblacion: f['Población'] ?? f['Poblacion'],
          codigoPostal: f['Código postal'] ?? f['Codigo postal'],
          provincia: f['Provincia'],
          telefono: f['Teléfono'] ?? f['Telefono'],
          referencia: Array.isArray(referenciaField) ? referenciaField[0] : referenciaField,
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Actualizar envío
  async updateEnvio(envioId: string, updates: Record<string, any>): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        numero: 'Número',
        numeroRecogida: 'Número de recogida',
        servicio: 'Servicio',
        estado: 'Estado',
        seguimiento: 'Seguimiento',
        fechaEnvio: 'Fecha de envío',
        material: 'Inventario',
        transporte: 'Transporte',
        catalogo: 'Catálogo',
        comentarios: 'Comentarios',
        cliente: 'Cliente',
        direccion: 'Dirección',
        poblacion: 'Población',
        codigoPostal: 'Código postal',
        provincia: 'Provincia',
        telefono: 'Teléfono',
      };

      const fields: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        const airtableField = fieldMap[key];
        if (!airtableField) return;
        
        // Permitir null para limpiar campos, pero omitir undefined
        if (value === undefined) return;
        
        if (airtableField === 'Catálogo') {
          fields[airtableField] = value ? [value] : [];
        } else {
          fields[airtableField] = value;
        }
      });

      if (Object.keys(fields).length === 0) return;

      await serviciosApi.patch(`/${AIRTABLE_ENVIOS_TABLE}/${envioId}`, { fields });

      // Si se está marcando como "Entregado", actualizar el servicio vinculado
      if (updates.estado === 'Entregado') {
        try {
          // Obtener la información completa del envío para verificar el producto y técnico
          const { data } = await serviciosApi.get(`/${AIRTABLE_ENVIOS_TABLE}/${envioId}`);
          const envioData = (data as any)?.fields;
          
          // Verificar el producto (lookup puede venir como array o string)
          const productoRaw = envioData?.['Producto'];
          const producto = Array.isArray(productoRaw) ? productoRaw[0] : productoRaw;
          
          // Obtener el técnico del envío (linked record, viene como array)
          const tecnicoEnvio = envioData?.['Técnicos'];
          const tecnicoId = Array.isArray(tecnicoEnvio) && tecnicoEnvio.length > 0 ? tecnicoEnvio[0] : null;
          
          console.log(`[Airtable] Producto detectado: "${producto}" (tipo: ${typeof producto}, raw:`, productoRaw, ')');

          if (tecnicoId) {

          } else {

          }
          
          const esSoportePulsar = producto === 'Soporte Pulsar Plus' || producto === 'Soporte Pulsar Max';
          
          // Obtener el ID del servicio vinculado
          const servicioId = envioData?.['Servicio']?.[0]; // El servicio es un linked record, viene como array
          
          if (servicioId) {
            if (esSoportePulsar) {
              // Si es Soporte Pulsar Plus o Max, actualizar a "Finalizado" y "Resolución visita" (sin asignar técnico)
              await serviciosApi.patch(`/${AIRTABLE_SERVICES_TABLE}/${servicioId}`, {
                fields: {
                  'Estado': 'Finalizado',
                  'Resolución visita': 'Reset y actualización',
                },
              });

            } else {
              // Si no es Soporte Pulsar, actualizar a "Pendiente de asignar"
              const updateFields: Record<string, any> = {
                'Estado': 'Pendiente de asignar',
              };
              
              // Si hay técnico en el envío, asignarlo al servicio (reemplazando el existente)
              if (tecnicoId) {
                updateFields['Técnico'] = [tecnicoId];
                console.log(`[Airtable] Asignando técnico ${tecnicoId} al servicio ${servicioId} (reemplazando existente si lo hay)`);
              }
              
              await serviciosApi.patch(`/${AIRTABLE_SERVICES_TABLE}/${servicioId}`, {
                fields: updateFields,
              });
              console.log(`[Airtable] Servicio ${servicioId} actualizado a "Pendiente de asignar" tras entrega del envío ${envioId} (producto: "${producto}")`);
            }
          }
        } catch (error) {

          // No lanzamos el error para no interrumpir la actualización del envío
        }
      }
    } catch (error) {

      throw error;
    }
  },

  // Crear envío
  async createEnvio(envio: {
    numero?: string;
    servicio: string;
    estado?: string;
    fechaEnvio?: string;
    material?: string;
    transporte?: string;
    catalogo?: string;
    comentarios?: string;
    cliente?: string;
    direccion?: string;
    poblacion?: string;
    codigoPostal?: string;
    provincia?: string;
    telefono?: string;
    tecnico?: string[];
  }): Promise<void> {
    try {
      const fields: Record<string, any> = {
        'Servicio': envio.servicio ? [envio.servicio] : undefined,
        'Estado': envio.estado ?? 'Envío creado',
        'Fecha de envío': envio.fechaEnvio,
        'Inventario': envio.material ? [envio.material] : undefined,
        'Transporte': envio.transporte ?? 'Tipsa',
        'Catálogo': envio.catalogo
          ? (String(envio.catalogo).startsWith('rec') ? [envio.catalogo] : envio.catalogo)
          : undefined,
        'Comentarios': envio.comentarios,
        'Destinatario': envio.cliente,
        'Dirección': envio.direccion,
        'Ciudad': envio.poblacion,
        'Código postal': envio.codigoPostal !== undefined && envio.codigoPostal !== null
          ? String(envio.codigoPostal)
          : undefined,
        'Provincia': envio.provincia,
        'Teléfono': envio.telefono,
        'Técnicos': envio.tecnico, // Linked record a tabla Técnicos
      };

      // Eliminar claves undefined para evitar errores 422
      Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

      await serviciosApi.post(`/${AIRTABLE_ENVIOS_TABLE}`, {
        records: [
          {
            fields,
          },
        ],
      });
    } catch (error) {
      const message = (error as any)?.response?.data?.error?.message;
      throw error;
    }
  },




  // Actualizar trabajador (campos en español)
  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    // Mapear a columnas en español de la tabla Trabajadores
    const fields: Record<string, any> = {};
    if (userData.name !== undefined) fields['Nombre'] = userData.name;
    if (userData.email !== undefined) fields['Email'] = userData.email;
    if (userData.phone !== undefined) fields['Teléfono'] = userData.phone;
    if (userData.clinic !== undefined) fields['Empresa'] = userData.clinic;
    if (userData.role !== undefined) fields['Cargo'] = userData.role;
    try {
      await airtableApi.patch(`/${AIRTABLE_WORKERS_TABLE}/${userId}`, { fields });
    } catch (error) {

      throw error;
    }
  },

  // Crear reunión (tabla "Reuniones"). Acepta fecha (YYYY-MM-DD) y opcionalmente hora (HH:mm).
  async createMeeting(params: { clinic: string; date: string; reason: string; time?: string }): Promise<void> {
    const { clinic, date, reason, time } = params;
    try {
      let dateToSend: string = date;
      if (time) {
        // Combina fecha + hora en un Date local y lo envía como ISO (UTC)
        const [year, month, day] = date.split('-').map((n) => parseInt(n, 10));
        const [hour, minute] = time.split(':').map((n) => parseInt(n, 10));
        const dt = new Date(year, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0, 0, 0);
        dateToSend = dt.toISOString();
      }

      await airtableApi.post('/Reuniones', {
        fields: {
          'Clínica': clinic,
          'Fecha': dateToSend, // ISO con hora si se pasó "time"
          'Motivo': reason,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Obtener llamadas (tabla "Registros" en base de registros)
  async getCalls(clinic?: string, advisorEmail?: string): Promise<{
    id: string;
    phone?: string;
    status?: string;
    clinic?: string;
    date?: string;
    time?: string;
    recordingUrl?: string;
    advisor?: string;
  }[]> {
    try {
      // Filtro de últimos 30 días + opcionalmente clínica y asesor
      const last30 = "IS_AFTER({Fecha}, DATEADD(TODAY(), -30, 'days'))";
      let formula = last30;
      let conditions: string[] = [last30];

      if (clinic) {
        const clinicEsc = String(clinic).replace(/'/g, "\\'");
        const clinicCond = `OR({Clínica} = '${clinicEsc}', {Clinic} = '${clinicEsc}')`;
        conditions.push(clinicCond);
      }

      if (advisorEmail) {
        const advisorEsc = String(advisorEmail).replace(/'/g, "\\'");
        const advisorCond = `FIND('${advisorEsc}', {Asesor})`;
        conditions.push(advisorCond);
      }

      if (conditions.length > 1) {
        formula = `AND(${conditions.join(', ')})`;
      }

      const records = await fetchAllRegistros('Registros', {
        filterByFormula: formula,
        pageSize: 100,
      });

      return records.map((r: any) => {
        const f = r.fields ?? {};
        const fechaRaw = f['Fecha'] ?? f['Date'];
        let dateISO: string | undefined;
        let timeStr: string | undefined;
        if (fechaRaw) {
          const d = new Date(fechaRaw);
          if (!isNaN(d.getTime())) {
            dateISO = d.toISOString();
            // hora local HH:mm
            timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          }
        }
        // Si existe un campo "Hora" separado, úsalo
        if (f['Hora']) {
          timeStr = f['Hora'];
        }

        // Campo de grabación: puede ser adjunto o URL en texto
        let recordingUrl: string | undefined;
        const grab = f['Grabación'] ?? f['Grabacion'] ?? f['Recording'];
        if (Array.isArray(grab) && grab.length > 0 && grab[0]?.url) {
          recordingUrl = grab[0].url;
        } else if (typeof grab === 'string') {
          recordingUrl = grab;
        }

        return {
          id: r.id,
          phone: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
          status: f['Estado'] ?? f['Status'],
          clinic: f['Clínica'] ?? f['Clinic'],
          date: dateISO,
          time: timeStr,
          recordingUrl,
          advisor: f['Asesor'] ?? f['Advisor'],
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Crear ticket de soporte (tabla "Tickets")
  async createTicket(params: { email: string; subject: string; message: string }): Promise<string | void> {
    const { email, subject, message } = params;
    const payload = {
      fields: {
        Email: email,
        'Asunto': subject,
        'Consulta': message,
      },
    } as const;
    try {
      const { data } = await airtableApi.post('/Tickets', payload);
      return (data as any)?.id;
    } catch (err) {

      throw err;
    }
  },

  // Obtener servicios (tabla "Servicios")
  async getServices(
    clinic?: string,
    workerId?: string,
    workerEmail?: string,
    options?: { view?: string },
  ): Promise<ServicioListado[]> {
    return fetchServicesByTable({
      tableName: AIRTABLE_SERVICES_TABLE,
      clinic,
      workerId,
      workerEmail,
      view: options?.view,
    });
  },

  // Obtener reparaciones (tabla "Reparaciones")
  async getReparaciones(_clinic?: string): Promise<any[]> {
    try {
      const records = await fetchAllServicios('Reparaciones', { pageSize: 100, view: 'Reparaciones' });
      
      return records.map((r: any) => {
        const f = r.fields ?? {};
        // Teléfono técnico es un campo Lookup que viene como array
        const telefonoTecnicoRaw = f['Teléfono técnico'];
        const telefonoTecnico = Array.isArray(telefonoTecnicoRaw) && telefonoTecnicoRaw.length > 0 
          ? telefonoTecnicoRaw[0] 
          : telefonoTecnicoRaw;
        
        return {
          id: r.id,
          cliente: f['Cliente'],
          telefono: f['Teléfono'] ?? f['Telefono'],
          tecnico: f['Técnicos'] ?? f['Técnico'] ?? f['Technician'],
          estado: f['Estado'],
          fechaEstado: f['Fecha estado'] ?? f['Fecha Estado'],
          seguimiento: f['Seguimiento'],
          fechaSeguimiento: f['Fecha seguimiento'] ?? f['Fecha Seguimiento'],
          expediente: f['Expediente'],
          resultado: f['Resultado'],
          reparacion: f['Reparación'],
          detalles: f['Detalles'],
          numeroSerie: f['Número de serie'] ?? f['Numero de serie'] ?? f['S/N'],
          numero: f['Número'] ?? f['Numero'],
          comentarios: f['Comentarios'],
          conversationId: f['Conversation id'],
          telefonoTecnico: telefonoTecnico,
          cita: f['Cita'],
          formularioId: f['Formulario'],
          direccion: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
          poblacion: f['Población'] ?? f['Poblacion'],
          provincia: f['Provincia'],
          codigoPostal: f['Código postal'] ?? f['Codigo postal'] ?? f['CP'],
          servicioId: f['Servicios'],
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Obtener tramitaciones (misma estructura que Servicios)
  async getTramitaciones(
    clinic?: string,
    workerId?: string,
    workerEmail?: string,
    options?: { onlyUnsynced?: boolean },
  ): Promise<ServicioListado[]> {
    // Tramitaciones usan la misma tabla "Servicios"; se filtra por Tramitado pendiente si aplica.
    const { onlyUnsynced = true } = options || {};
    return fetchServicesByTable({ tableName: AIRTABLE_SERVICES_TABLE, clinic, workerId, workerEmail, onlyUnsynced });
  },

  async setTramitacionTramitado(recordId: string, value: boolean): Promise<void> {
    try {
      const fields: Record<string, any> = {
        'Tramitado': value,
      };
      
      // Si se marca como tramitado, actualizar la fecha de sincronización
      if (value === true) {
        const fechaTramitacion = new Date().toISOString();
        fields['Fecha sincronización'] = fechaTramitacion;
        
        // NO creamos registros en Supabase aquí porque ya se crean desde Services.tsx
        // cuando se actualiza el campo Ipartner
      }
      
      await serviciosApi.patch(`/${AIRTABLE_SERVICES_TABLE}/${recordId}`, {
        fields,
      });
    } catch (error) {

      throw error;
    }
  },

  // Helper para trackear tramitación desde el cambio de Ipartner
  async trackTramitacionSupabase(expediente: string, fechaCierre?: string, fechaTramitacion?: string): Promise<void> {
    try {
      await supabaseService.trackTramitacion(expediente, fechaCierre, fechaTramitacion);
    } catch (error) {

      // No lanzar el error para no interrumpir el flujo del usuario
    }
  },

  // Actualizar comentarios de un servicio
  async updateServiceComments(serviceId: string, comentarios: string, tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {
      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          'Comentarios': comentarios,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Actualizar estado de un servicio
  async updateServiceStatus(serviceId: string, estado: string, tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {
      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Actualizar campo genérico de un servicio
  async updateServiceField(serviceId: string, field: string, value: string | string[] | boolean | number | null, tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        estado: 'Estado',
        estadoIpas: 'Estado Ipas',
        comentarios: 'Comentarios',
        tecnico: 'Técnico',
        notaTecnico: 'Nota técnico',
        cita: 'Cita',
        citaTecnico: 'Cita técnico',
        trabajadorId: 'Trabajador',
        motivoCancelacion: 'Motivo cancelación',
        seguimiento: 'Seguimiento',
        motivoTecnico: 'Motivo técnico',
      };
      
      const airtableField = fieldMap[field] || field;
      
      console.log(`[Airtable] Updating field "${airtableField}" with value:`, value, `(type: ${typeof value})`);

      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          [airtableField]: value,
        },
      });
      

    } catch (error: any) {

      console.error('Error response data:', JSON.stringify(error?.response?.data, null, 2));


      throw error;
    }
  },

  // Actualizar campo linked records de un servicio (para arrays)
  async updateServiceLinkedField(serviceId: string, field: string, value: string[], tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {
      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          [field]: value,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Actualizar múltiples campos de un servicio a la vez
  async updateServiceFields(serviceId: string, fields: Record<string, any>, tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {

      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: fields,
      });

    } catch (error: any) {

      console.error('Error response data:', JSON.stringify(error?.response?.data, null, 2));
      throw error;
    }
  },

  // Actualizar técnico de un servicio (linked record)
  async updateServiceTecnico(serviceId: string, tecnicoId: string | string[], tableName: string = AIRTABLE_SERVICES_TABLE): Promise<void> {
    try {
      const value = Array.isArray(tecnicoId) ? tecnicoId : (tecnicoId ? [tecnicoId] : []);
      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          'Técnico': value,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Obtener trabajadores desde Airtable
  async getTrabajadores(): Promise<{ id: string; nombre: string }[]> {
    try {
      const records = await fetchAllServicios(AIRTABLE_WORKERS_TABLE, { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          nombre: f['Nombre'] ?? f['Name'] ?? 'Sin nombre',
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Obtener técnicos desde Airtable
  async getTechnicians(): Promise<import('../types').Tecnico[]> {
    try {
      const records = await fetchAllServicios('Técnicos', { pageSize: 100 });
      const technicians = records
        .map((r: any) => {
          const f = r.fields ?? {};
          const estado = f['Estado'] ?? f['Status'];

          // Omitimos técnicos en estado "De baja" para no mostrarlos en los listados.
          if (typeof estado === 'string' && estado.toLowerCase() === 'de baja') {
            return null;
          }

          return {
            id: r.id,
            nombre: f['Nombre'] ?? f['Name'],
            provincia: f['Provincia'] ?? f['Province'],
            estado,
            telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
            observaciones: f['Observaciones'] ?? f['Observacion'] ?? f['Notes'],
          };
        })
        .filter(Boolean) as import('../types').Tecnico[];

      return technicians;
    } catch (error) {

      return [];
    }
  },

  // Obtener un técnico por ID
  async getTechnicianById(technicianId: string): Promise<import('../types').Tecnico | null> {
    try {
      const response = await serviciosApi.get(`/Técnicos/${technicianId}`);
      const f = response.data.fields ?? {};
      return {
        id: response.data.id,
        nombre: f['Nombre'] ?? f['Name'],
        provincia: f['Provincia'] ?? f['Province'],
        estado: f['Estado'] ?? f['Status'],
        telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
        observaciones: f['Observaciones'] ?? f['Observacion'] ?? f['Notes'],
      };
    } catch (error) {

      return null;
    }
  },

  // Crear nuevo técnico
  async createTechnician(technician: Omit<import('../types').Tecnico, 'id'>): Promise<import('../types').Tecnico> {
    try {
      const response = await serviciosApi.post(`/Técnicos`, {
        records: [{
          fields: {
            'Nombre': technician.nombre || '',
            'Provincia': technician.provincia || '',
            'Estado': technician.estado || 'Sin contactar',
            'Teléfono': technician.telefono || '',
            'Observaciones': technician.observaciones || '',
          }
        }]
      });

      const createdRecord = response.data.records[0];
      const f = createdRecord.fields;
      return {
        id: createdRecord.id,
        nombre: f['Nombre'],
        provincia: f['Provincia'],
        estado: f['Estado'],
        telefono: f['Teléfono'],
        observaciones: f['Observaciones'],
      };
    } catch (error) {

      throw new Error('Error al crear el técnico');
    }
  },

  // Actualizar observaciones de un técnico
  async updateTechnicianObservations(technicianId: string, observaciones: string): Promise<void> {
    try {
      await serviciosApi.patch(`/Técnicos/${technicianId}`, {
        fields: {
          'Observaciones': observaciones,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Actualizar estado de un técnico
  async updateTechnicianStatus(technicianId: string, estado: string): Promise<void> {
    try {
      await serviciosApi.patch(`/Técnicos/${technicianId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Obtener ID del trabajador por nombre
  async getWorkerIdByName(name: string): Promise<string | null> {
    try {
      const response = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}`, {
        params: {
          filterByFormula: `{Nombre} = '${name.replace(/'/g, "\\'")}'`,
          maxRecords: 1,
        },
      });
      const data = response.data as { records: any[] };
      return data.records.length > 0 ? data.records[0].id : null;
    } catch (error) {

      return null;
    }
  },

  // Obtener registros (tabla "Registros")
  async getRegistros(options: { view?: string } = {}): Promise<{
    id: string;
    contrato?: string;
    nombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    estado?: string;
    cita?: string;
    comentarios?: string;
    informe?: string;
    asesor?: string;
    expediente?: string;
    tramitado?: boolean;
    ipartner?: string;
    fechaIpartner?: string;
    pdf?: any[];
  }[]> {
    try {
      const records = await fetchAllRegistros('Registros', {
        pageSize: 100,
        ...(options.view ? { view: options.view } : {}),
      });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          contrato: f['Contrato'] ?? f['Nº Contrato'] ?? f['Numero'] ?? f['Número'],
          nombre: f['Nombre'] ?? f['Cliente'],
          telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Tel'],
          email: f['Email'] ?? f['Correo'],
          direccion: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
          estado: f['Estado'],
          cita: f['Cita'],
          comentarios: f['Comentarios'],
          informe: f['Informe'],
          asesor: f['Asesor'] ?? f['Advisor'],
          expediente: f['Expediente'],
          tramitado: f['Tramitado'] ?? false,
          ipartner: f['Ipartner'],
          fechaIpartner: f['Fecha Ipartner'],
          pdf: f['PDF'] || f['Pdf'] || f['pdf'] || [],
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Actualizar registro
  async updateRegistro(registroId: string, updates: { estado?: string; cita?: string; comentarios?: string; tramitado?: boolean; ipartner?: string }): Promise<void> {
    try {
      // Primero obtener los datos del registro para Supabase
      let expediente: string | undefined;
      let fechaCreacion: string | undefined;
      
      try {
        const { data } = await registrosApi.get(`/Registros/${registroId}`);
        const expedienteRaw = data?.fields?.['Expediente'];
        // Convertir expediente a string si es número
        expediente = expedienteRaw != null ? String(expedienteRaw) : undefined;
        fechaCreacion = data?.fields?.['Creación'];

      } catch (err) {

      }
      
      const fields: Record<string, any> = {};
      
      if (updates.estado !== undefined) {
        fields['Estado'] = updates.estado;
        
        // Si el estado cambia a Informe, Ilocalizable o No interesado, trackear en Supabase
        const estadosParaTrackear = ['Informe', 'Ilocalizable', 'No interesado'];
        console.log('[updateRegistro] Verificando tracking:', {
          estado: updates.estado,
          esEstadoParaTrackear: estadosParaTrackear.includes(updates.estado),
          tieneExpediente: !!expediente,
          expedienteValor: expediente,
          noVacio: expediente ? expediente.trim() !== '' : false
        });
        
        if (estadosParaTrackear.includes(updates.estado) && expediente && expediente.trim() !== '') {

          const fechaInforme = new Date().toISOString();
          supabaseService.trackAsesoramiento(expediente, fechaCreacion, fechaInforme).catch(err => {

          });
        } else {

        }
      }
      
      if (updates.cita !== undefined) {
        fields['Cita'] = updates.cita;
      }
      
      if (updates.comentarios !== undefined) {
        fields['Comentarios'] = updates.comentarios;
      }
      
      if (updates.tramitado !== undefined) {
        fields['Tramitado'] = updates.tramitado;
      }
      
      if (updates.ipartner !== undefined) {
        fields['Ipartner'] = updates.ipartner;
      }
      
      await registrosApi.patch(`/Registros/${registroId}`, { fields });
    } catch (error) {

      throw error;
    }
  },

  // Actualizar estado de una llamada (en tabla Registros)
  async updateCall(callId: string, estado: string): Promise<void> {
    try {
      // Primero obtener los datos del registro para Supabase
      let expediente: string | undefined;
      let fechaCreacion: string | undefined;
      
      try {
        const { data } = await registrosApi.get(`/Registros/${callId}`);
        const expedienteRaw = data?.fields?.['Expediente'];
        // Convertir expediente a string si es número
        expediente = expedienteRaw != null ? String(expedienteRaw) : undefined;
        fechaCreacion = data?.fields?.['Creación'];
      } catch (err) {

      }
      
      await registrosApi.patch(`/Registros/${callId}`, {
        fields: {
          'Estado': estado,
        },
      });
      
      // Si el estado cambia a Informe, Ilocalizable o No interesado, trackear en Supabase
      const estadosParaTrackear = ['Informe', 'Ilocalizable', 'No interesado'];
      if (estadosParaTrackear.includes(estado) && expediente && expediente.trim() !== '') {
        const fechaInforme = new Date().toISOString();
        supabaseService.trackAsesoramiento(expediente, fechaCreacion, fechaInforme).catch(err => {

        });
      }
    } catch (error) {

      throw error;
    }
  },

  // Obtener estadísticas de Asesoramientos
  async getAsesoramientosStats(): Promise<{
    totalRegistros: number;
    informesToday: number;
  }> {
    try {
      const records = await fetchAllRegistros('Registros', { pageSize: 100 });
      const today = new Date().toISOString().split('T')[0];
      
      let totalRegistros = 0;
      let informesToday = 0;
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const estado = f['Estado'];
        const ipartner = f['Ipartner'];
        const fechaIpartner = f['Fecha Ipartner'];
        const pdf = f['PDF'] || f['Pdf'] || f['pdf'] || [];
        const tramitado = f['Tramitado'] ?? false;
        
        // Filtrar registros con la misma lógica que en Registros.tsx
        const ipartnerExcluidos = ['No interesado', 'Ilocalizable', 'Facturado', 'Cancelado'];
        const isIpartnerExcluded = ipartner && ipartnerExcluidos.includes(ipartner);
        const isCitadoWithoutPdf = estado === 'Citado' && (!pdf || pdf.length === 0);
        
        // Excluir si: Estado=Informe y PDF vacío
        const isInformeWithoutPdf = estado === 'Informe' && (!pdf || pdf.length === 0);
        
        // Excluir si: Estado=Informe, Ipartner=Citado, Fecha Ipartner hace menos de una semana, y PDF vacío
        const isInformeWithRecentCitedIpartnerAndNoPdf = 
          estado === 'Informe' && 
          ipartner === 'Citado' && 
          (!pdf || pdf.length === 0) &&
          fechaIpartner &&
          (() => {
            const fecha = new Date(fechaIpartner);
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return fecha > sevenDaysAgo;
          })();
        
        const shouldShow = !isIpartnerExcluded && !isCitadoWithoutPdf && !isInformeWithoutPdf && !isInformeWithRecentCitedIpartnerAndNoPdf;
        
        // Contar registros válidos
        if (shouldShow && !tramitado) {
          totalRegistros++;
        }
        
        // Contar informes de hoy (Estado = "Informe" y Fecha = hoy)
        if (estado === 'Informe' && f['Fecha']) {
          const fechaRegistro = new Date(f['Fecha']).toISOString().split('T')[0];
          if (fechaRegistro === today) {
            informesToday++;
          }
        }
      });
      
      return {
        totalRegistros,
        informesToday,
      };
    } catch (error) {

      return {
        totalRegistros: 0,
        informesToday: 0,
      };
    }
  },

  // Obtener estadísticas de estados de asesoramientos para gráfico de donut
  async getAsesoramientosEstadosStats(): Promise<{
    estadosData: { name: string; value: number; percentage: number }[];
  }> {
    try {
      const records = await fetchAllRegistros('Registros', { pageSize: 100 });
      
      // Obtener el mes y año actual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Estados específicos a mostrar
      const estadosPermitidos = ['No interesado', 'Ilocalizable', 'Informe'];
      
      const estadosCounts: Record<string, number> = {};
      let totalValidos = 0;
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const estado = f['Estado'];
        const fecha = f['Fecha'];
        
        // Solo incluir registros del mes actual y con estados específicos
        if (fecha && estado && estadosPermitidos.includes(estado)) {
          const fechaRegistro = new Date(fecha);
          const esDelMesActual = fechaRegistro.getMonth() === currentMonth && fechaRegistro.getFullYear() === currentYear;
          
          if (esDelMesActual) {
            estadosCounts[estado] = (estadosCounts[estado] || 0) + 1;
            totalValidos++;
          }
        }
      });
      
      // Convertir a array y calcular porcentajes
      const estadosData = Object.entries(estadosCounts)
        .map(([name, value]) => ({
          name,
          value,
          percentage: Math.round((value / totalValidos) * 100 * 10) / 10, // Redondear a 1 decimal
        }))
        .sort((a, b) => b.value - a.value); // Ordenar por valor descendente
      
      return { estadosData };
    } catch (error) {

      return { estadosData: [] };
    }
  },

  // Obtener formularios por IDs de linked records
  async getFormulariosByIds(formularioIds: string[] | string): Promise<any[]> {
    try {
      if (!formularioIds) {
        return [];
      }

      // Normalizar a array y filtrar IDs válidos
      let rawIds: any[] = [];
      if (Array.isArray(formularioIds)) {
        rawIds = formularioIds;
      } else {
        rawIds = [formularioIds];
      }

      const ids: string[] = [];
      for (const item of rawIds) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        // Caso 1: ID directo (ej: rec...)
        if (trimmed.startsWith('rec')) {
          ids.push(trimmed);
          continue;
        }
        // Caso 2: URL que contiene el ID (ej: ...?id=rec...)
        const match = trimmed.match(/[?&]id=(rec[a-zA-Z0-9]+)/);
        if (match) {
          ids.push(match[1]);
        }
      }

      if (ids.length === 0) {
        // Silenciamos este log porque es común que venga basura o URLs sin ID
        // console.log('No hay IDs válidos (rec...) de formularios para buscar');
        return [];
      }
      
      // console.log('Buscando formularios por IDs validados:', ids);
      const results: any[] = [];
      
      // Obtener cada formulario por su ID
      for (const id of ids) {
        try {
          const { data } = await serviciosApi.get(`/Formularios/${id}`);
          results.push(mapFormularioRecord(data));
        } catch (error) {

        }
      }
      
      // console.log('Formularios encontrados:', results.length);
      return results;
    } catch (error) {

      return [];
    }
  },

  // Mantener compatibilidad: Obtener formularios por número
  async getFormularioByExpediente(expediente: string): Promise<any[]> {
    try {

      const escapedExpediente = escapeFormulaString(expediente);
      const records = await fetchAllServicios('Formularios', {
        filterByFormula: `{Número} = '${escapedExpediente}'`,
        pageSize: 100,
      });
      

      if (records.length === 0) {
        return [];
      }
      return records.map(mapFormularioRecord);
    } catch (error) {

      return [];
    }
  },

  async getFormularioByClientInfo(params: { expediente?: string; direccion?: string; nombre?: string }): Promise<any[]> {
    const { expediente, direccion, nombre } = params;
    const clauses: string[] = [];

    const { names: formulariosFieldNames } = await inferServiciosFieldSample('Formularios');

    const escapeValue = (value?: string) => (value ? value.replace(/'/g, "\\'") : '');
    const joinOr = (parts: string[]) => parts.length === 1 ? parts[0] : `OR(${parts.join(',')})`;

    if (expediente && formulariosFieldNames.has('Expediente')) {
      clauses.push(`{Expediente} = '${escapeValue(expediente)}'`);
    }

    if (direccion) {
      const dirFields = ['Dirección', 'Direccion', 'Address'].filter((f) => formulariosFieldNames.has(f));
      if (dirFields.length > 0) {
        const dirEsc = escapeValue(direccion);
        clauses.push(joinOr(dirFields.map((f) => `{${f}} = '${dirEsc}'`)));
      }
    }

    if (nombre) {
      const nameFields = ['Nombre', 'Cliente'].filter((f) => formulariosFieldNames.has(f));
      if (nameFields.length > 0) {
        const nomEsc = escapeValue(nombre);
        clauses.push(joinOr(nameFields.map((f) => `{${f}} = '${nomEsc}'`)));
      }
    }

    if (clauses.length === 0) return [];

    try {
      const formula = joinOr(clauses);
      const records = await fetchAllServicios('Formularios', {
        filterByFormula: formula,
        pageSize: 100,
      });


      return records.map(mapFormularioRecord);
    } catch (error) {

      return [];
    }
  },

  async getFormularioById(recordId: string): Promise<any | null> {
    try {
      const { data } = await serviciosApi.get(`/Formularios/${recordId}`);
      if (!(data as any)?.id) return null;
      return mapFormularioRecord(data);
    } catch (error) {

      return null;
    }
  },

  // Obtener formulario random con fotos para usar como fallback
  async getRandomFormularioWithPhotos(): Promise<any> {
    try {
      const records = await fetchAllServicios('Formularios', {
        filterByFormula: `OR(
          NOT({Foto general} = BLANK()),
          NOT({Foto etiqueta} = BLANK()),
          NOT({Foto roto} = BLANK()),
          NOT({Foto cuadro} = BLANK())
        )`,
        pageSize: 100,
      });
      
      if (records.length === 0) {
        throw new Error('No se encontraron formularios con fotos');
      }
      
      // Seleccionar un registro random
      const randomIndex = Math.floor(Math.random() * records.length);
      const r = records[randomIndex];
      return mapFormularioRecord(r);
    } catch (error) {

      throw error;
    }
  },

  // Obtener reparación random con fotos para usar como fallback
  async getRandomReparacionWithPhotos(): Promise<any> {
    try {
      const records = await fetchAllServicios('Reparaciones', {
        filterByFormula: `OR(
          NOT({Foto} = BLANK()),
          NOT({Foto de la etiqueta} = BLANK())
        )`,
        pageSize: 100,
      });
      
      if (records.length === 0) {
        throw new Error('No se encontraron reparaciones con fotos');
      }
      
      // Seleccionar un registro random
      const randomIndex = Math.floor(Math.random() * records.length);
      const r = records[randomIndex];
      const f = r.fields ?? {};
      
      return {
        id: r.id,
        numero: f['Número'],
        tecnico: f['Técnico'] ?? f['Technician'],
        resultado: f['Resultado'] ?? f['Result'],
        reparacion: f['Reparación'] ?? f['Repair'],
        cuadroElectrico: f['Cuadro eléctrico'] ?? f['Electrical Panel'],
        detalles: f['Detalles'] ?? f['Details'] ?? f['Descripción'],
        Foto: f['Foto'],
        foto: f['Foto'],
        fotoGeneral: f['Foto'],
        'Foto de la etiqueta': f['Foto de la etiqueta'],
        fotoEtiqueta: f['Foto de la etiqueta'],
        numeroSerie: f['Número de serie'] ?? f['Numero de serie'] ?? f['S/N'] ?? f['# S/N'] ?? f['Nº Serie'] ?? f['SN'],
      };
    } catch (error) {

      throw error;
    }
  },

  // Obtener reparaciones por IDs de linked records
  async getReparacionesByIds(reparacionIds: string[] | string): Promise<any[]> {
    try {
      if (!reparacionIds) {
        return [];
      }

      // Normalizar a array y filtrar IDs válidos
      let rawIds: any[] = [];
      if (Array.isArray(reparacionIds)) {
        rawIds = reparacionIds;
      } else {
        rawIds = [reparacionIds];
      }

      const ids: string[] = [];
      for (const item of rawIds) {
        if (typeof item !== 'string') continue;
        const trimmed = item.trim();
        // Caso 1: ID directo
        if (trimmed.startsWith('rec')) {
          ids.push(trimmed);
          continue;
        }
        // Caso 2: URL con id=rec...
        const match = trimmed.match(/[?&]id=(rec[a-zA-Z0-9]+)/);
        if (match) {
          ids.push(match[1]);
        }
      }

      if (ids.length === 0) {
        // Silenciamos log
        return [];
      }
      
      // console.log('Buscando reparaciones por IDs validados:', ids);
      const results: any[] = [];
      
      // Obtener cada reparación por su ID
      for (const id of ids) {
        try {
          const { data } = await serviciosApi.get(`/Reparaciones/${id}`);
          const f = data.fields ?? {};
          
          // Obtener nombres de técnicos desde la tabla Técnicos
          let tecnicoValue = '';
          if (Array.isArray(f['Técnicos']) && f['Técnicos'].length > 0) {
            const tecnicosIds = f['Técnicos'];
            const nombresPromises = tecnicosIds.map(async (tecnicoId: string) => {
              try {
                const { data: tecnicoData } = await serviciosApi.get(`/Técnicos/${tecnicoId}`);
                return tecnicoData.fields?.['Nombre'] || tecnicoId;
              } catch (error) {

                return tecnicoId;
              }
            });
            const nombres = await Promise.all(nombresPromises);
            tecnicoValue = nombres.join(', ');
          }
          
          const tecnicoResolved = tecnicoValue || f['Técnico'] || f['Technician'];
          const estadoResolved = f['Estado'] || f['Resultado'] || f['Result'];
          const resultadoResolved = f['Resultado'] || f['Result'] || f['Estado'];
          const reparacionResolved = f['Motivo'] || f['Reparación'] || f['Repair'];
          const detallesResolved = f['Detalles'] || f['Details'] || f['Descripción'];
          const comentariosResolved = f['Comentarios'];
          const citaTecnicoResolved = f['Cita técnico'] || f['Cita'];

          results.push({
            id: data.id,
            numero: f['Número'],
            tecnico: tecnicoResolved,
            resultado: resultadoResolved,
            reparacion: reparacionResolved,
            cuadroElectrico: f['Material'] || f['Cuadro eléctrico'] || f['Electrical Panel'],
            detalles: detallesResolved,
            // Campos esperados por la vista
            Estado: estadoResolved,
            Resultado: resultadoResolved,
            Reparación: reparacionResolved,
            Técnico: tecnicoResolved,
            Detalles: detallesResolved,
            Comentarios: comentariosResolved,
            'Cita técnico': citaTecnicoResolved,
            // Campos adicionales disponibles
            cliente: f['Cliente'],
            direccion: f['Dirección'],
            poblacion: f['Población'],
            provincia: f['Provincia'],
            telefono: f['Teléfono'],
            telefonoTecnico: f['Teléfono técnico'],
            cita: citaTecnicoResolved,
            comentarios: comentariosResolved,
            seguimiento: f['Seguimiento'],
            // Campo de foto principal
            Foto: f['Foto'],
            foto: f['Foto'],
            fotoGeneral: f['Foto'],
            // Campo de foto de la etiqueta
            'Foto de la etiqueta': f['Foto de la etiqueta'],
            fotoEtiqueta: f['Foto de la etiqueta'],
            numeroSerie: f['Número de serie'] || f['Numero de serie'] || f['S/N'] || f['# S/N'] || f['Nº Serie'] || f['SN'],
          });
        } catch (error) {

        }
      }
      

      return results;
    } catch (error) {

      throw error;
    }
  },

  // Mantener compatibilidad: Obtener reparaciones por número
  async getReparacionesByExpediente(expediente: string): Promise<any[]> {
    try {

      const escapedExpediente = escapeFormulaString(expediente);
      const records = await fetchAllServicios('Reparaciones', {
        filterByFormula: `{Número} = '${escapedExpediente}'`,
        pageSize: 100,
      });
      

      if (records.length === 0) {
        return [];
      }
      
      // Obtener nombres de técnicos para todos los registros
      const resultsWithTecnicos = await Promise.all(records.map(async (r: any) => {
        const f = r.fields ?? {};
        
        // Obtener nombres de técnicos desde la tabla Técnicos
        let tecnicoValue = '';
        if (Array.isArray(f['Técnicos']) && f['Técnicos'].length > 0) {
          const tecnicosIds = f['Técnicos'];
          const nombresPromises = tecnicosIds.map(async (tecnicoId: string) => {
            try {
              const { data: tecnicoData } = await serviciosApi.get(`/Técnicos/${tecnicoId}`);
              return tecnicoData.fields?.['Nombre'] || tecnicoId;
            } catch (error) {

              return tecnicoId;
            }
          });
          const nombres = await Promise.all(nombresPromises);
          tecnicoValue = nombres.join(', ');
        }
        
        return {
          id: r.id,
          numero: f['Número'],
          tecnico: tecnicoValue || f['Técnico'] || f['Technician'],
          resultado: f['Estado'] || f['Resultado'] || f['Result'],
          reparacion: f['Motivo'] || f['Reparación'] || f['Repair'],
          cuadroElectrico: f['Material'] || f['Cuadro eléctrico'] || f['Electrical Panel'],
          detalles: f['Detalles'] || f['Details'] || f['Descripción'],
          // Campos adicionales disponibles
          cliente: f['Cliente'],
          direccion: f['Dirección'],
          poblacion: f['Población'],
          provincia: f['Provincia'],
          telefono: f['Teléfono'],
          telefonoTecnico: f['Teléfono técnico'],
          cita: f['Cita'],
          comentarios: f['Comentarios'],
          seguimiento: f['Seguimiento'],
          // Campo de foto principal
          Foto: f['Foto'],
          foto: f['Foto'],
          fotoGeneral: f['Foto'],
          // Campo de foto de la etiqueta
          'Foto de la etiqueta': f['Foto de la etiqueta'],
          fotoEtiqueta: f['Foto de la etiqueta'],
          numeroSerie: f['Número de serie'] || f['Numero de serie'] || f['S/N'] || f['# S/N'] || f['Nº Serie'] || f['SN'],
        };
      }));
      
      return resultsWithTecnicos;
    } catch (error) {

      throw error;
    }
  },

  // Actualizar campo de formulario
  async updateFormularioField(formId: string, field: string, value: string): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        'detalles': 'Detalles',
        'potenciaContratada': 'Potencia contratada',
        'fechaInstalacion': 'Fecha instalación',
      };
      
      const airtableField = fieldMap[field] || field;
      
      await serviciosApi.patch(`/Formularios/${formId}`, {
        fields: {
          [airtableField]: value,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Subir foto a formulario (campo de attachments) usando el backend proxy
  async uploadFormularioPhoto(formId: string, photoField: string, file: File): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        'fotoGeneral': 'Foto general',
        'fotoEtiqueta': 'Foto etiqueta',
        'fotoRoto': 'Foto roto',
        'fotoCuadro': 'Foto cuadro',
      };
      
      const airtableField = fieldMap[photoField] || photoField;
      
      // Convertir archivo a base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Usar el endpoint del backend para subir attachments
      await axios.post(
        `${BACKEND_URL}/api/upload-attachment`,
        {
          baseId: 'appX3CBiSmPy4119D', // Base de servicios
          recordId: formId,
          tableName: 'Formularios',
          fieldName: airtableField,
          file: {
            contentType: file.type,
            filename: file.name,
            data: base64,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Error al subir foto');
    }
  },

  // Actualizar campo de reparación
  async updateReparacionField(repId: string, field: string, value: string): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        'tecnico-rep': 'Técnico',
        'resultado': 'Resultado',
        'reparacion': 'Reparación',
        'cuadroElectrico': 'Cuadro eléctrico',
        'detalles-rep': 'Detalles',
      };
      
      const airtableField = fieldMap[field] || field;
      
      await serviciosApi.patch(`/Reparaciones/${repId}`, {
        fields: {
          [airtableField]: value,
        },
      });
    } catch (error) {

      throw error;
    }
  },

  // Obtener recursos desde la tabla "Recursos" en la base de servicios
  async getResources(workerId?: string): Promise<{
    id: string;
    name: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    imageUrl?: string;
    enlace?: string;
  }[]> {
    try {
      const records = await fetchAllServicios('Recursos', { pageSize: 100 });
      return records
        .filter((r: any) => {
          if (!workerId) return true;
          const f = r.fields ?? {};
          const trabajadores = f['Trabajadores'] || f['Trabajador'];
          if (!trabajadores) return false;
          const trabajadoresArray = Array.isArray(trabajadores) ? trabajadores : [trabajadores];
          return trabajadoresArray.includes(workerId);
        })
        .map((r: any) => {
        const f = r.fields ?? {};
        
        // Procesar archivo adjunto
        let fileUrl: string | undefined;
        let fileName: string | undefined;
        const archivoField = f['Archivo'];
        if (Array.isArray(archivoField) && archivoField.length > 0) {
          fileUrl = archivoField[0]?.url;
          fileName = archivoField[0]?.filename;
        }
        
        // Procesar foto
        let imageUrl: string | undefined;
        const fotoField = f['Foto'];
        if (Array.isArray(fotoField) && fotoField.length > 0) {
          imageUrl = fotoField[0]?.url || fotoField[0]?.thumbnails?.large?.url;
        }
        
        return {
          id: r.id,
          name: f['Nombre'] ?? '',
          description: f['Descripción'] ?? f['Descripcion'],
          fileUrl,
          fileName,
          imageUrl,
          enlace: f['Enlace'],
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Obtener tareas desde la tabla "Tareas" en la base de servicios
  async getTasks(): Promise<{
    id: string;
    tarea: string;
    estado: string;
    prioridad?: string;
    fechaLimite?: string;
    notas?: string;
    fechaModificacion?: string;
  }[]> {
    try {
      const records = await fetchAllServicios('Tareas', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        
        return {
          id: r.id,
          tarea: f['Tarea'] ?? '',
          estado: f['Estado'] ?? 'Pendiente',
          prioridad: f['Prioridad'],
          fechaLimite: f['Fecha límite'] ?? f['Fecha limite'],
          notas: f['Notas'],
          fechaModificacion: f['Last Modified'] ?? r.createdTime,
        };
      });
    } catch (error) {

      return [];
    }
  },

  // Actualizar estado de una tarea
  async updateTaskStatus(taskId: string, estado: string): Promise<void> {
    try {

      const response = await serviciosApi.patch(`/Tareas/${taskId}`, {
        fields: {
          'Estado': estado,
        },
      });

    } catch (error: any) {

      if (error.response) {


      }
      throw error;
    }
  },

  // Obtener contratos de chatbot
  async getContracts(): Promise<any[]> {
    try {
      const TABLE_NAME = 'tblG2iusherLVxgSv';
      
      const all: any[] = [];
      let offset: string | undefined;
      
      do {
        const { data } = await registrosApi.get(`/${TABLE_NAME}`, {
          params: { offset }
        });
        const airtableData = data as { records?: any[]; offset?: string };
        all.push(...(airtableData.records ?? []));
        offset = airtableData.offset;
      } while (offset);

      return all.map((record: any) => ({
        id: record.id,
        ...record.fields,
      }));
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al obtener contratos');
    }
  },

  // Actualizar campo de contrato
  async updateContractField(contractId: string, fieldName: string, value: any): Promise<void> {
    try {
      const TABLE_NAME = 'tblG2iusherLVxgSv';
      
      await registrosApi.patch(`/${TABLE_NAME}/${contractId}`, {
        fields: {
          [fieldName]: value,
        },
      });
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al actualizar contrato');
    }
  },

  // Subir PDF a contrato a través del backend
  async uploadContractPDF(contractId: string, file: File): Promise<any> {
    try {
      const CONTRACTS_BASE_ID = 'applcT2fcdNDpCRQ0';
      const TABLE_ID = 'tblG2iusherLVxgSv';

      // Convertir archivo a base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Extraer solo la parte base64 (sin el prefijo data:...)
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Usar el endpoint del backend para subir attachments
      const response = await axios.post(
        `${BACKEND_URL}/api/upload-attachment`,
        {
          baseId: CONTRACTS_BASE_ID,
          tableId: TABLE_ID,
          recordId: contractId,
          fieldName: 'PDF',
          file: {
            contentType: file.type,
            filename: file.name,
            data: base64,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error al subir PDF (via backend):', error);
      throw new Error(error.response?.data?.error || error.message || 'Error al subir PDF');
    }
  },

  // Obtener comentarios del servicio linkado en Reparaciones
  async getServicioComentarios(servicioId: string): Promise<string | undefined> {
    try {
      if (!servicioId) return undefined;
      
      const { data } = await serviciosApi.get(`/${AIRTABLE_SERVICES_TABLE}/${servicioId}`);
      const fields = (data as any)?.fields ?? {};
      return fields['Comentarios'] || undefined;
    } catch (error) {

      return undefined;
    }
  },

  // Obtener datos completos del servicio
  async getServicioData(servicioId: string): Promise<any> {
    try {
      if (!servicioId) return null;
      
      const { data } = await serviciosApi.get(`/${AIRTABLE_SERVICES_TABLE}/${servicioId}`);
      return data;
    } catch (error) {

      return null;
    }
  },

  // ============================================
  // VALORACIONES
  // ============================================

  // Obtener todas las valoraciones
  async getValoraciones(): Promise<any[]> {
    try {
      const TABLE_NAME = 'Valoraciones';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      const response = await valoracionesApi.get(`/${TABLE_NAME}`, {
        params: { pageSize: 100, view: 'Valoraciones' },
      });

      const data = response.data as { records: any[] };
      

      // Procesar cada valoración para obtener el campo Cliente del servicio linkado
      const valoracionesConCliente = await Promise.all(
        data.records.map(async (record: any) => {

          let cliente = undefined;
          let telefono = undefined;
          let conversationId = undefined;
          
          // Si tiene servicios linkados, obtener el cliente del primer servicio
          if (record.fields['Servicios'] && Array.isArray(record.fields['Servicios']) && record.fields['Servicios'].length > 0) {
            const servicioId = record.fields['Servicios'][0];
            try {
              // Usar serviciosApi para obtener el servicio de la base correcta
              const servicioResponse = await serviciosApi.get(`/${AIRTABLE_SERVICES_TABLE}/${servicioId}`);
              // Intentar varios nombres posibles para el campo cliente
              cliente = servicioResponse.data?.fields?.['Cliente'] || 
                       servicioResponse.data?.fields?.['Nombre'] ||
                       servicioResponse.data?.fields?.['Name'];
              // Obtener teléfono
              telefono = servicioResponse.data?.fields?.['Teléfono'] ||
                        servicioResponse.data?.fields?.['Telefono'] ||
                        servicioResponse.data?.fields?.['Phone'];
              // Obtener conversationId - probar múltiples variantes del nombre
              conversationId = servicioResponse.data?.fields?.['Conversation id'] ||
                              servicioResponse.data?.fields?.['Conversation ID'] ||
                              servicioResponse.data?.fields?.['ConversationId'];

            } catch (error) {

            }
          } else {

          }
          
          return {
            id: record.id,
            servicios: record.fields['Servicios'],
            cliente: cliente,
            telefono: telefono,
            conversationId: conversationId,
            valoracionCliente: record.fields['Valoración cliente'],
            estado: record.fields['Estado'],
            codigos: record.fields['Códigos'], // IDs de los códigos linked
          };
        })
      );
      

      return valoracionesConCliente;
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al obtener valoraciones');
    }
  },

  // Obtener códigos con estado "Sin enviar"
  async getCodigosSinEnviar(): Promise<any[]> {
    try {
      const VALORACIONES_BASE_ID = 'appX3CBiSmPy4119D';
      const TABLE_NAME = 'Códigos';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      const response = await valoracionesApi.get(`/${TABLE_NAME}`, {
        params: {
          filterByFormula: "{Estado} = 'Sin enviar'",
          pageSize: 100,
        },
      });

      const data = response.data as { records: any[] };
      return data.records.map((record: any) => ({
        id: record.id,
        codigo: record.fields['Código'],
        estado: record.fields['Estado'],
      }));
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al obtener códigos');
    }
  },

  // Actualizar estado de valoración
  async updateValoracionEstado(valoracionId: string, estado: string): Promise<void> {
    try {
      const VALORACIONES_BASE_ID = 'appX3CBiSmPy4119D';
      const TABLE_NAME = 'Valoraciones';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      await valoracionesApi.patch(`/${TABLE_NAME}/${valoracionId}`, {
        fields: {
          Estado: estado,
        },
      });
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al actualizar estado');
    }
  },

  // Actualizar valoración cliente (estrellas)
  async updateValoracionCliente(valoracionId: string, valoracion: number): Promise<void> {
    try {
      const VALORACIONES_BASE_ID = 'appX3CBiSmPy4119D';
      const TABLE_NAME = 'Valoraciones';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      await valoracionesApi.patch(`/${TABLE_NAME}/${valoracionId}`, {
        fields: {
          'Valoración cliente': valoracion,
        },
      });
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al actualizar valoración');
    }
  },

  // Actualizar códigos de valoración
  async updateValoracionCodigos(valoracionId: string, codigosIds: string[]): Promise<void> {
    try {
      const VALORACIONES_BASE_ID = 'appX3CBiSmPy4119D';
      const TABLE_NAME = 'Valoraciones';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      await valoracionesApi.patch(`/${TABLE_NAME}/${valoracionId}`, {
        fields: {
          Códigos: codigosIds,
        },
      });
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al actualizar códigos');
    }
  },

  // Actualizar estado de código
  async updateCodigoEstado(codigoId: string, estado: string): Promise<void> {
    try {
      const TABLE_NAME = 'Códigos';
      
      // Crear cliente específico para la base de valoraciones
      const valoracionesApi = axios.create({
        baseURL: `${BACKEND_URL}/api/valoraciones`,
        timeout: 30000,
      });

      // Interceptor para añadir token
      valoracionesApi.interceptors.request.use(async (config) => {
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      await valoracionesApi.patch(`/${TABLE_NAME}/${codigoId}`, {
        fields: {
          Estado: estado,
        },
      });
    } catch (error: any) {

      throw new Error(error.response?.data?.error || 'Error al actualizar estado del código');
    }
  },
};   