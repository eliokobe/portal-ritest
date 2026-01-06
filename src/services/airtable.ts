/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { User, DashboardStats } from '../types';

// Base ID fijo (no es secreto). Si se define VITE_AIRTABLE_BASE_ID la sobreescribe.
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || 'appRMClMob8KPNooU';
// API Key solo por variable de entorno (no hardcodear). Placeholder si falta.
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || 'your-api-key';
// Base de Servicios y Trabajadores (misma base)
const SERVICIOS_BASE_ID = import.meta.env.VITE_AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
// Nombre de la tabla de trabajadores. Se puede sobreescribir con VITE_AIRTABLE_WORKERS_TABLE, pero por defecto es 'Trabajadores'
const AIRTABLE_WORKERS_TABLE = import.meta.env.VITE_AIRTABLE_WORKERS_TABLE || 'Trabajadores';
// Nombre de la tabla de servicios. Se puede sobreescribir con VITE_AIRTABLE_SERVICES_TABLE, pero por defecto es 'Servicios'
const AIRTABLE_SERVICES_TABLE = import.meta.env.VITE_AIRTABLE_SERVICES_TABLE || 'Servicios';
// Nombre de la tabla de tramitaciones. Por defecto 'Tramitaciones'
const AIRTABLE_TRAMITACIONES_TABLE = import.meta.env.VITE_AIRTABLE_TRAMITACIONES_TABLE || 'Tramitaciones';
// Nombre de la tabla de envios. Por defecto 'Envíos'
const AIRTABLE_ENVIOS_TABLE = import.meta.env.VITE_AIRTABLE_ENVIOS_TABLE || 'Envíos';

if (AIRTABLE_BASE_ID === 'your-base-id') {
  // Build sin sustituir env -> avisamos en runtime
  console.error('[Airtable] Falta VITE_AIRTABLE_BASE_ID en build; usando placeholder');
}
if (AIRTABLE_API_KEY === 'your-api-key') {
  console.error('[Airtable] Falta VITE_AIRTABLE_API_KEY (no habrá acceso a Airtable)');
}

// Debug logs
console.log('[Airtable] Configuración:');
console.log('- AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID);
console.log('- AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? 'Configurado' : 'Falta');
console.log('- SERVICIOS_BASE_ID:', SERVICIOS_BASE_ID);

const airtableApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

const serviciosApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${SERVICIOS_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos de timeout
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
    console.warn(`[Airtable] No se pudo inferir campos de ${tableName}; se continuará sin inferencia.`, error);
    serviciosFieldSampleCache[tableName] = { names: new Set<string>(), sampleFields: {} };
    return serviciosFieldSampleCache[tableName];
  }
}

// Segunda base de Airtable para Registros
const REGISTROS_BASE_ID = 'applcT2fcdNDpCRQ0';
const registrosApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${REGISTROS_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
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
    console.error('fetchAllServicios - Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
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
}): Promise<ServicioListado[]> {
  const { tableName, clinic, workerId, workerEmail, onlyUnsynced } = params;
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

      console.log('[Airtable] Filtrando por email trabajador:', {
        workerEmail,
        emailEsc,
        emailField,
        tableName
      });

      // Email trabajador es un lookup, por lo tanto es un array
      // Usar FIND para buscar el email en el array del lookup
      formulaParts.push(`FIND('${emailEsc}', ARRAYJOIN({${emailField}}, ',')) > 0`);
      console.log('[Airtable] Fórmula de filtro por email añadida:', formulaParts[formulaParts.length - 1]);
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
        console.warn(`[Airtable] No existe columna Trabajador/Workers en ${tableName}; se omite filtro por trabajador.`);
      }
    }

    if (onlyUnsynced) {
      // Para tramitaciones usamos campo "Tramitado" (checkbox) pendiente
      console.log('[Airtable] onlyUnsynced activado, verificando campo Tramitado...', {
        hasTramitadoField: serviciosFieldNames.has('Tramitado'),
        allFields: Array.from(serviciosFieldNames),
        sampleTramitadoValue: (sampleFields as any)?.['Tramitado']
      });
      if (serviciosFieldNames.has('Tramitado')) {
        formulaParts.push('OR({Tramitado}=BLANK(), {Tramitado}=FALSE())');
        console.log('[Airtable] Filtro Tramitado añadido: OR({Tramitado}=BLANK(), {Tramitado}=FALSE())');
      } else {
        console.warn(`[Airtable] La tabla ${tableName} no tiene campo "Tramitado"; no se aplicará filtro de sincronización.`);
      }
    }

    if (formulaParts.length > 0) {
      queryParams.filterByFormula = formulaParts.length === 1 ? formulaParts[0] : `AND(${formulaParts.join(', ')})`;
    }

    console.log('[Airtable] Filtro final construido:', {
      tableName,
      clinic,
      workerEmail,
      workerId,
      filterByFormula: queryParams.filterByFormula || 'SIN FILTRO'
    });

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
        accionIpartner: f['Acción Ipartner'] ?? f['Accion Ipartner'],
        ipartner: f['Ipartner'],
        seguimiento: f['Seguimiento'],
      };
    });

    console.log('[Airtable] Registros recuperados y mapeados:', {
      tableName,
      totalRecords: mappedRecords.length,
      sampleRecord: mappedRecords[0] ? {
        expediente: mappedRecords[0].expediente,
        estado: mappedRecords[0].estado,
        tramitado: mappedRecords[0].tramitado,
        accionIpartner: mappedRecords[0].accionIpartner,
        ipartner: mappedRecords[0].ipartner
      } : 'No hay registros'
    });

    return mappedRecords;
  } catch (error) {
    console.error(`Error fetching servicios desde ${tableName}:`, error);
    return [];
  }
}



export const airtableService = {
  // Obtener catálogo (linked records) tabla "Catálogo"
  async getCatalogos(): Promise<{ id: string; nombre: string }[]> {
    try {
      const records = await fetchAllServicios('Catálogo', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          nombre: f['Nombre'] ?? 'Sin nombre',
        };
      });
    } catch (error) {
      console.error('Error fetching catálogo:', error);
      return [];
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
        console.log('Airtable record fields:', record.fields);
        
        const logoField = record.fields.Logo;
        let logoUrl: string | undefined;
        if (Array.isArray(logoField) && logoField.length > 0) {
          const first = logoField[0];
          logoUrl = (first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.full?.url) as string | undefined;
        }
        
        console.log('Role field values:', {
          Rol: record.fields.Rol,
          Cargo: record.fields.Cargo,
          Role: record.fields.Role,
          final: record.fields.Rol || record.fields.Cargo || record.fields.Role
        });
        
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
      console.error('Error authenticating user:', error);
      return null;
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
      console.error('Error fetching worker logo:', error);
      return undefined;
    }
  },

  // Obtener estadísticas del dashboard para Técnico
  async getTechnicianDashboardStats(userId?: string, userEmail?: string): Promise<{
    assignedByDay: { date: string; count: number }[];
    resolvedByDay: { date: string; count: number }[];
  }> {
    try {
      const records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, { pageSize: 100 });
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      // Preparar mapa de días (últimos 14 días, solo días laborables: lunes a viernes)
      const dayKey = (d: Date) => d.toISOString().split('T')[0];
      const last14Keys: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
        // Solo agregar si es día laborable (lunes=1 a viernes=5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          last14Keys.push(dayKey(d));
        }
      }
      const assignedMap = new Map(last14Keys.map(k => [k, 0]));
      const resolvedMap = new Map(last14Keys.map(k => [k, 0]));
      
      console.log(`Processing ${records.length} records for technician dashboard`);
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const fechaRegistro = f['Fecha de registro'];
        const ultimoCambio = f['Último cambio'];
        const estado = f['Estado'];
        const tecnico = f['Técnico'];
        const emailTrabajador = f['Email trabajador'];
        
        // Servicios asignados (últimas 2 semanas por fecha de registro, donde Email trabajador contiene el email del usuario)
        if (fechaRegistro) {
          const regDate = new Date(fechaRegistro);
          
          // Verificar que Email trabajador contenga el email del usuario
          let hasUserEmail = false;
          if (userEmail && emailTrabajador) {
            if (typeof emailTrabajador === 'string') {
              hasUserEmail = emailTrabajador.includes(userEmail);
            } else if (Array.isArray(emailTrabajador)) {
              hasUserEmail = emailTrabajador.some((email: string) => email && email.includes(userEmail));
            }
          }
          
          if (hasUserEmail && regDate >= fourteenDaysAgo && regDate <= now) {
            const key = dayKey(regDate);
            if (assignedMap.has(key)) {
              assignedMap.set(key, assignedMap.get(key)! + 1);
            }
          }
        }
        
        // Incidencias resueltas: Estado = Finalizado, Técnico vacío, Email trabajador contiene el email del usuario, últimas 2 semanas
        if (estado === 'Finalizado' && ultimoCambio) {
          const resDate = new Date(ultimoCambio);
          
          // Verificar que Técnico esté vacío
          const isTecnicoEmpty = !tecnico || 
            (typeof tecnico === 'string' && tecnico.trim() === '') || 
            (Array.isArray(tecnico) && tecnico.length === 0);
          
          // Verificar que Email trabajador contenga el email del usuario
          let hasUserEmail = false;
          if (userEmail && emailTrabajador) {
            if (typeof emailTrabajador === 'string') {
              hasUserEmail = emailTrabajador.includes(userEmail);
            } else if (Array.isArray(emailTrabajador)) {
              hasUserEmail = emailTrabajador.some((email: string) => email && email.includes(userEmail));
            }
          }
          
          // Solo contar si cumple todas las condiciones Y está en el rango de 2 semanas
          if (isTecnicoEmpty && hasUserEmail && resDate >= fourteenDaysAgo && resDate <= now) {
            const key = dayKey(resDate);
            if (resolvedMap.has(key)) {
              resolvedMap.set(key, resolvedMap.get(key)! + 1);
            }
          }
        }
      });
      
      const assignedByDay = last14Keys.map(k => ({ date: k, count: assignedMap.get(k)! }));
      const resolvedByDay = last14Keys.map(k => ({ date: k, count: resolvedMap.get(k)! }));
      
      console.log('Assigned by day:', assignedByDay);
      console.log('Resolved by day:', resolvedByDay);
      
      return { assignedByDay, resolvedByDay };
    } catch (error) {
      console.error('Error fetching technician dashboard stats:', error);
      const now = new Date();
      const last14Keys: string[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        last14Keys.push(d.toISOString().split('T')[0]);
      }
      return {
        assignedByDay: last14Keys.map(k => ({ date: k, count: 0 })),
        resolvedByDay: last14Keys.map(k => ({ date: k, count: 0 })),
      };
    }
  },

  // Obtener estadísticas del dashboard para Administrativa (sincronización)
  async getAdminDashboardStats(): Promise<{
    unsynchronizedCount: number;
    synchronizedTodayCount: number;
  }> {
    try {
      const records = await fetchAllServicios(AIRTABLE_SERVICES_TABLE, { pageSize: 100 });
      const today = new Date().toISOString().split('T')[0];
      
      let unsynchronizedCount = 0;
      let synchronizedTodayCount = 0;
      
      records.forEach((r: any) => {
        const f = r.fields ?? {};
        const tramitado = f['Tramitado'];
        const fechaSincronizacion = f['Fecha sincronización'] ?? f['Fecha sincronizacion'];
        const accionIpartner = f['Acción Ipartner'];
        const ipartner = f['Ipartner'];
        const importe = f['Importe'];
        const estado = f['Estado'];
        
        // Condición 1: Registros pendientes de tramitar
        const isPendiente = !tramitado &&
          accionIpartner && (typeof accionIpartner === 'string' ? accionIpartner.trim() !== '' : accionIpartner.length > 0) &&
          ipartner !== 'Cancelado' && ipartner !== 'Finalizado';
        
        // Condición 2: Estado = Finalizado, Ipartner no es Cancelado, Importe = 0
        const isFinalized = estado === 'Finalizado' && 
          ipartner !== 'Cancelado' &&
          (importe === 0 || importe === null || importe === undefined);
        
        if (isPendiente || isFinalized) {
          unsynchronizedCount++;
        }
        
        // Tramitados hoy (Tramitado true y fecha de sincronización hoy)
        if (tramitado === true && fechaSincronizacion) {
          const syncDate = new Date(fechaSincronizacion).toISOString().split('T')[0];
          if (syncDate === today) {
            synchronizedTodayCount++;
          }
        }
      });
      
      return {
        unsynchronizedCount,
        synchronizedTodayCount,
      };
    } catch (error) {
      console.error('Error fetching admin dashboard stats:', error);
      return {
        unsynchronizedCount: 0,
        synchronizedTodayCount: 0,
      };
    }
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
        console.log('Total de registros obtenidos:', records.length);
      } catch (error) {
        console.warn('No se pudo acceder a la tabla Servicios:', error);
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
          
          console.log('Registro:', {
            expediente: fields.Expediente || fields['Nº Expediente'],
            fechaValue,
            estado: fields.Estado,
            createdTime: r.createdTime
          });
          
          return {
            fecha: new Date(fechaValue),
            estado: fields.Estado || fields.Status,
          };
        })
        .filter((r: ServiceRec) => !isNaN(r.fecha.getTime())); // solo fechas válidas
      
      console.log('Total de servicios procesados:', services.length);

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
      console.error('Error fetching dashboard stats:', error);
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
        console.log('Inventario record:', { id: r.id, fields: f, numeroSerie });
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
      console.error('Error fetching inventario:', error);
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
    material?: string;
    producto?: string;
    fechaCambio?: string;
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
      const records = await fetchAllServicios(AIRTABLE_ENVIOS_TABLE, { pageSize: 100 });
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
          material: Array.isArray(materialField) ? materialField[0] : materialField,
          producto: f['Producto'] ?? f['Modelo'],
          fechaCambio: f['Fecha Cambio'] ?? f['Last Modified'] ?? r.createdTime,
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
      console.error('Error fetching envíos:', error);
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
        if (value === undefined || value === null) return;
        const airtableField = fieldMap[key];
        if (!airtableField) return;
        if (airtableField === 'Catálogo') {
          fields[airtableField] = value ? [value] : [];
        } else {
          fields[airtableField] = value;
        }
      });

      if (Object.keys(fields).length === 0) return;

      await serviciosApi.patch(`/${AIRTABLE_ENVIOS_TABLE}/${envioId}`, { fields });
    } catch (error) {
      console.error('Error updating envío:', error);
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
  }): Promise<void> {
    try {
      const fields: Record<string, any> = {
        'Servicio': envio.servicio ? [envio.servicio] : undefined,
        'Estado': envio.estado ?? 'Envío creado',
        'Fecha de envío': envio.fechaEnvio,
        'Inventario': envio.material ? [envio.material] : undefined,
        'Transporte': envio.transporte ?? 'Inbound Logística',
        'Catálogo': envio.catalogo
          ? (String(envio.catalogo).startsWith('rec') ? [envio.catalogo] : envio.catalogo)
          : undefined,
        'Comentarios': envio.comentarios,
        'Cliente': envio.cliente,
        'Dirección': envio.direccion,
        'Población': envio.poblacion,
        'Código postal': envio.codigoPostal !== undefined && envio.codigoPostal !== null
          ? String(envio.codigoPostal)
          : undefined,
        'Provincia': envio.provincia,
        'Teléfono': envio.telefono,
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
      console.error('Error creating envío:', message || error);
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
      console.error('Error updating user:', error);
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
      console.error('Error creating meeting:', error);
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
      console.error('Error fetching calls:', error);
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
      console.error('Error creating support ticket:', err);
      throw err;
    }
  },

  // Obtener servicios (tabla "Servicios")
  async getServices(clinic?: string, workerId?: string, workerEmail?: string): Promise<ServicioListado[]> {
    return fetchServicesByTable({ tableName: AIRTABLE_SERVICES_TABLE, clinic, workerId, workerEmail });
  },

  // Obtener reparaciones (tabla "Reparaciones")
  async getReparaciones(clinic?: string): Promise<any[]> {
    try {
      const queryParams: Record<string, any> = {};
      
      if (clinic) {
        const clinicEsc = escapeFormulaString(clinic);
        queryParams.filterByFormula = `{Cliente} = '${clinicEsc}'`;
      }
      
      const records = await fetchAllServicios('Reparaciones', { ...queryParams, pageSize: 100 });
      
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
          comentarios: f['Comentarios'],
          conversationId: f['Conversation id'],
          telefonoTecnico: telefonoTecnico,
          cita: f['Cita'],
          formularioId: f['Formulario'],
          direccion: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
          poblacion: f['Población'] ?? f['Poblacion'],
        };
      });
    } catch (error) {
      console.error('Error fetching reparaciones:', error);
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
    return this.updateServiceField(recordId, 'Tramitado', value, AIRTABLE_SERVICES_TABLE);
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
      console.error('Error updating service comments:', error);
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
      console.error('Error updating service status:', error);
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
      };
      
      const airtableField = fieldMap[field] || field;
      
      console.log(`[Airtable] Updating field "${airtableField}" with value:`, value, `(type: ${typeof value})`);
      
      await serviciosApi.patch(`/${tableName}/${serviceId}`, {
        fields: {
          [airtableField]: value,
        },
      });
      
      console.log(`[Airtable] Successfully updated field "${airtableField}"`);
    } catch (error: any) {
      console.error(`Error updating service field ${field}:`, error);
      console.error('Error details:', error?.response?.data);
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
      console.error(`Error updating service linked field ${field}:`, error);
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
      console.error('Error updating service técnico:', error);
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
      console.error('Error fetching trabajadores:', error);
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
      console.error('Error fetching technicians:', error);
      return [];
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
      console.error('Error creating technician:', error);
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
      console.error('Error updating technician observations:', error);
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
      console.error('Error updating technician status:', error);
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
      console.error('Error fetching worker by name:', error);
      return null;
    }
  },

  // Obtener registros (tabla "Registros")
  async getRegistros(): Promise<{
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
      const records = await fetchAllRegistros('Registros', { pageSize: 100 });
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
      console.error('Error fetching registros:', error);
      return [];
    }
  },

  // Actualizar registro
  async updateRegistro(registroId: string, updates: { estado?: string; cita?: string; comentarios?: string; tramitado?: boolean; ipartner?: string }): Promise<void> {
    try {
      const fields: Record<string, any> = {};
      
      if (updates.estado !== undefined) {
        fields['Estado'] = updates.estado;
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
      console.error('Error updating registro:', error);
      throw error;
    }
  },

  // Actualizar estado de una llamada (en tabla Registros)
  async updateCall(callId: string, estado: string): Promise<void> {
    try {
      await registrosApi.patch(`/Registros/${callId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {
      console.error('Error updating call status:', error);
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
        
        const shouldShow = !isIpartnerExcluded && !isCitadoWithoutPdf && !isInformeWithRecentCitedIpartnerAndNoPdf;
        
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
      console.error('Error fetching asesoramientos stats:', error);
      return {
        totalRegistros: 0,
        informesToday: 0,
      };
    }
  },

  // Obtener formularios por IDs de linked records
  async getFormulariosByIds(formularioIds: string[]): Promise<any[]> {
    try {
      if (!formularioIds || formularioIds.length === 0) {
        console.log('No hay IDs de formularios para buscar');
        return [];
      }
      
      console.log('Buscando formularios por IDs:', formularioIds);
      const results: any[] = [];
      
      // Obtener cada formulario por su ID
      for (const id of formularioIds) {
        try {
          const { data } = await serviciosApi.get(`/Formularios/${id}`);
          results.push(mapFormularioRecord(data));
        } catch (error) {
          console.error(`Error al obtener formulario ${id}:`, error);
        }
      }
      
      console.log('Formularios encontrados:', results.length);
      return results;
    } catch (error) {
      console.error('Error fetching formularios:', error);
      return [];
    }
  },

  // Mantener compatibilidad: Obtener formularios por número
  async getFormularioByExpediente(expediente: string): Promise<any[]> {
    try {
      console.log('Buscando formularios para número:', expediente);
      const escapedExpediente = escapeFormulaString(expediente);
      const records = await fetchAllServicios('Formularios', {
        filterByFormula: `{Número} = '${escapedExpediente}'`,
        pageSize: 100,
      });
      
      console.log('Records encontrados para formularios:', records.length);
      if (records.length === 0) {
        return [];
      }
      return records.map(mapFormularioRecord);
    } catch (error) {
      console.error('Error fetching formularios:', error);
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

      console.log('[Formularios] Búsqueda por datos de cliente', {
        expediente,
        direccion,
        nombre,
        encontrados: records.length,
      });

      return records.map(mapFormularioRecord);
    } catch (error) {
      console.error('Error buscando formularios por datos de cliente:', error);
      return [];
    }
  },

  async getFormularioById(recordId: string): Promise<any | null> {
    try {
      const { data } = await serviciosApi.get(`/Formularios/${recordId}`);
      if (!(data as any)?.id) return null;
      return mapFormularioRecord(data);
    } catch (error) {
      console.error('Error fetching formulario by id:', error);
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
      console.error('Error fetching random formulario:', error);
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
      console.error('Error fetching random reparacion:', error);
      throw error;
    }
  },

  // Obtener reparaciones por IDs de linked records
  async getReparacionesByIds(reparacionIds: string[]): Promise<any[]> {
    try {
      if (!reparacionIds || reparacionIds.length === 0) {
        console.log('No hay IDs de reparaciones para buscar');
        return [];
      }
      
      console.log('Buscando reparaciones por IDs:', reparacionIds);
      const results: any[] = [];
      
      // Obtener cada reparación por su ID
      for (const id of reparacionIds) {
        try {
          const { data } = await serviciosApi.get(`/Reparaciones/${id}`);
          const f = data.fields ?? {};
          results.push({
            id: data.id,
            numero: f['Número'],
            tecnico: f['Técnico'] ?? f['Technician'],
            resultado: f['Resultado'] ?? f['Result'],
            reparacion: f['Reparación'] ?? f['Repair'],
            cuadroElectrico: f['Cuadro eléctrico'] ?? f['Electrical Panel'],
            detalles: f['Detalles'] ?? f['Details'] ?? f['Descripción'],
            // Campo de foto principal
            Foto: f['Foto'],
            foto: f['Foto'],
            fotoGeneral: f['Foto'],
            // Campo de foto de la etiqueta
            'Foto de la etiqueta': f['Foto de la etiqueta'],
            fotoEtiqueta: f['Foto de la etiqueta'],
            numeroSerie: f['Número de serie'] ?? f['Numero de serie'] ?? f['S/N'] ?? f['# S/N'] ?? f['Nº Serie'] ?? f['SN'],
          });
        } catch (error) {
          console.error(`Error al obtener reparación ${id}:`, error);
        }
      }
      
      console.log('Reparaciones encontradas:', results.length);
      return results;
    } catch (error) {
      console.error('Error fetching reparaciones:', error);
      throw error;
    }
  },

  // Mantener compatibilidad: Obtener reparaciones por número
  async getReparacionesByExpediente(expediente: string): Promise<any[]> {
    try {
      console.log('Buscando reparaciones para número:', expediente);
      const escapedExpediente = escapeFormulaString(expediente);
      const records = await fetchAllServicios('Reparaciones', {
        filterByFormula: `{Número} = '${escapedExpediente}'`,
        pageSize: 100,
      });
      
      console.log('Records encontrados para reparaciones:', records.length);
      if (records.length === 0) {
        return [];
      }
      
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          numero: f['Número'],
          tecnico: f['Técnico'] ?? f['Technician'],
          resultado: f['Resultado'] ?? f['Result'],
          reparacion: f['Reparación'] ?? f['Repair'],
          cuadroElectrico: f['Cuadro eléctrico'] ?? f['Electrical Panel'],
          detalles: f['Detalles'] ?? f['Details'] ?? f['Descripción'],
          // Campo de foto principal
          Foto: f['Foto'],
          foto: f['Foto'],
          fotoGeneral: f['Foto'],
          // Campo de foto de la etiqueta
          'Foto de la etiqueta': f['Foto de la etiqueta'],
          fotoEtiqueta: f['Foto de la etiqueta'],
          numeroSerie: f['Número de serie'] ?? f['Numero de serie'] ?? f['S/N'] ?? f['# S/N'] ?? f['Nº Serie'] ?? f['SN'],
        };
      });
    } catch (error) {
      console.error('Error fetching reparaciones:', error);
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
      console.error(`Error updating formulario field ${field}:`, error);
      throw error;
    }
  },

  // Subir foto a formulario (campo de attachments)
  async uploadFormularioPhoto(formId: string, photoField: string, fileUrl: string): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        'fotoGeneral': 'Foto general',
        'fotoEtiqueta': 'Foto etiqueta',
        'fotoRoto': 'Foto roto',
        'fotoCuadro': 'Foto cuadro',
      };
      
      const airtableField = fieldMap[photoField] || photoField;
      
      await serviciosApi.patch(`/Formularios/${formId}`, {
        fields: {
          [airtableField]: [{ url: fileUrl }],
        },
      });
    } catch (error) {
      console.error(`Error uploading photo to ${photoField}:`, error);
      throw error;
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
      console.error(`Error updating reparacion field ${field}:`, error);
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
      console.error('Error fetching resources:', error);
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
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  // Actualizar estado de una tarea
  async updateTaskStatus(taskId: string, estado: string): Promise<void> {
    try {
      console.log('Updating task:', taskId, 'with estado:', estado);
      const response = await serviciosApi.patch(`/Tareas/${taskId}`, {
        fields: {
          'Estado': estado,
        },
      });
      console.log('Task update response:', response.data);
    } catch (error: any) {
      console.error('Error updating task status:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      throw error;
    }
  },

  // Obtener contratos de chatbot
  async getContracts(): Promise<any[]> {
    try {
      const CONTRACTS_BASE_ID = 'applcT2fcdNDpCRQ0'; // Base específica para contratos
      const TABLE_NAME = 'tblG2iusherLVxgSv';
      
      const contractsApi = axios.create({
        baseURL: `https://api.airtable.com/v0/${CONTRACTS_BASE_ID}`,
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      const all: any[] = [];
      let offset: string | undefined;
      
      do {
        const { data } = await contractsApi.get(`/${TABLE_NAME}`, {
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
      console.error('Error fetching contracts:', error);
      throw new Error(error.response?.data?.error || 'Error al obtener contratos');
    }
  },

  // Actualizar campo de contrato
  async updateContractField(contractId: string, fieldName: string, value: any): Promise<void> {
    try {
      const CONTRACTS_BASE_ID = 'applcT2fcdNDpCRQ0';
      const TABLE_NAME = 'tblG2iusherLVxgSv';
      
      const contractsApi = axios.create({
        baseURL: `https://api.airtable.com/v0/${CONTRACTS_BASE_ID}`,
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      await contractsApi.patch(`/${TABLE_NAME}/${contractId}`, {
        fields: {
          [fieldName]: value,
        },
      });
    } catch (error: any) {
      console.error('Error updating contract field:', error);
      throw new Error(error.response?.data?.error || 'Error al actualizar contrato');
    }
  },
};   