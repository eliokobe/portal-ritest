/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { User, DashboardStats, Registro } from '../types';

// Base ID fijo (no es secreto). Si se define VITE_AIRTABLE_BASE_ID la sobreescribe.
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID || 'appRMClMob8KPNooU';
// API Key solo por variable de entorno (no hardcodear). Placeholder si falta.
const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY || 'your-api-key';
// Base de Servicios y Trabajadores (misma base)
const SERVICIOS_BASE_ID = import.meta.env.VITE_AIRTABLE_SERVICES_BASE_ID || 'appX3CBiSmPy4119D';
// Nombre de la tabla de trabajadores. Se puede sobreescribir con VITE_AIRTABLE_WORKERS_TABLE, pero por defecto es 'Trabajadores'
const AIRTABLE_WORKERS_TABLE = import.meta.env.VITE_AIRTABLE_WORKERS_TABLE || 'Trabajadores';

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
});

// Segunda base de Airtable para Registros
const REGISTROS_BASE_ID = 'applcT2fcdNDpCRQ0';
const registrosApi = axios.create({
  baseURL: `https://api.airtable.com/v0/${REGISTROS_BASE_ID}`,
  headers: {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Helper para paginar Airtable
async function fetchAllRecords(table: string, params: Record<string, any> = {}) {
  const all: any[] = [];
  let offset: string | undefined;
  do {
    const { data } = await airtableApi.get(`/${table}`, { params: { ...params, offset } });
    const airtableData = data as { records?: any[]; offset?: string };
    all.push(...(airtableData.records ?? []));
    offset = airtableData.offset;
  } while (offset);
  return all;
}

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
  do {
    const { data } = await serviciosApi.get(`/${table}`, { params: { ...params, offset } });
    const airtableData = data as { records?: any[]; offset?: string };
    all.push(...(airtableData.records ?? []));
    offset = airtableData.offset;
  } while (offset);
  return all;
}



export const airtableService = {
  // Autenticación
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const response = await serviciosApi.get(`/${AIRTABLE_WORKERS_TABLE}`, {
        params: {
          filterByFormula: `AND({Email} = '${email}', {Contraseña} = '${password}')`,
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
          email: record.fields.Email,
          name: record.fields.Nombre || record.fields.Name,
          phone: record.fields.Teléfono || record.fields.Phone,
          clinic: record.fields.Empresa || record.fields.Clinic,
          role: record.fields.Rol || record.fields.Cargo || record.fields.Role,
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

  // Obtener estadísticas del dashboard (desde tabla Servicios)
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Traer TODOS los servicios sin filtros
      let records: any[] = [];
      try {
        records = await fetchAllServicios('Servicios', {
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

  // Obtener llamadas (tabla "Llamadas")
  async getCalls(clinic?: string): Promise<{
    id: string;
    phone?: string;
    status?: string;
    clinic?: string;
    date?: string;
    time?: string;
    recordingUrl?: string;
  }[]> {
    try {
      // Filtro de últimos 30 días + opcionalmente clínica (soporta 'Clínica' y 'Clinic')
      const last30 = "IS_AFTER({Fecha}, DATEADD(TODAY(), -30, 'days'))";
      let formula = last30;
      if (clinic) {
        const clinicEsc = String(clinic).replace(/'/g, "\\'");
        const clinicCond = `OR({Clínica} = '${clinicEsc}', {Clinic} = '${clinicEsc}')`;
        formula = `AND(${last30}, ${clinicCond})`;
      }
      const records = await fetchAllRecords('Llamadas', {
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
  async getServices(clinic?: string, workerId?: string, workerEmail?: string): Promise<{
    id: string;
    expediente?: string;
    nombre?: string;
    telefono?: string;
    direccion?: string;
    estado?: string;
    estadoIpas?: string;
    descripcion?: string;
    comentarios?: string;
    materialEnviado?: string;
    cita?: string;
    tecnico?: string;
    notaTecnico?: string;
    fechaRegistro?: string;
    ultimoCambio?: string;
    chatbot?: string;
  }[]> {
    try {
      const params: Record<string, any> = {};

      console.log('Airtable - getServices called with clinic:', clinic, 'workerId:', workerId, 'workerEmail:', workerEmail);

      let formulaParts: string[] = [];

      if (clinic) {
        const clinicEsc = String(clinic).replace(/'/g, "\\'");
        formulaParts.push(`OR({Empresa} = '${clinicEsc}', {Clinic} = '${clinicEsc}', {Cliente} = '${clinicEsc}')`);
        console.log('Airtable - Clinic filter:', formulaParts[formulaParts.length - 1]);
      }

      if (workerEmail) {
        const emailEsc = String(workerEmail).replace(/'/g, "\\'");
        // Buscar por email en el campo Trabajadores (ahora es texto)
        formulaParts.push(`FIND('${emailEsc}', {Trabajadores})`);
        console.log('Airtable - Worker email filter:', formulaParts[formulaParts.length - 1]);
      } else if (workerId) {
        const workerIdEsc = String(workerId).replace(/'/g, "\\'");
        // Para Linked Records, necesitamos usar ARRAYJOIN para convertir el array a string
        formulaParts.push(`FIND('${workerIdEsc}', ARRAYJOIN({Trabajadores}))`);
        console.log('Airtable - Worker ID filter:', formulaParts[formulaParts.length - 1]);
      }

      if (formulaParts.length > 0) {
        params.filterByFormula = formulaParts.length === 1 ? formulaParts[0] : `AND(${formulaParts.join(', ')})`;
        console.log('Airtable - Combined filter formula:', params.filterByFormula);
      } else {
        console.log('Airtable - No filters applied');
      }

      console.log('Airtable - Calling fetchAllServicios...');
      const records = await fetchAllServicios('Servicios', { ...params, pageSize: 100 });
      console.log('Airtable - Records received:', records.length);

      const mappedRecords = records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          expediente: f['Expediente'] ?? f['Nº Expediente'] ?? f['Numero'] ?? f['Número'],
          nombre: f['Nombre'] ?? f['Cliente'],
          telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Tel'],
          direccion: f['Dirección'] ?? f['Direccion'] ?? f['Address'],
          estado: f['Estado'],
          estadoIpas: f['Estado Ipas'] ?? f['Estado IPAS'] ?? f['EstadoIpas'],
          descripcion: f['Descripción'] ?? f['Descripcion'] ?? f['Description'],
          comentarios: f['Comentarios'],
          materialEnviado: f['Material enviado'] ?? f['Material Enviado'] ?? f['Material'],
          cita: f['Cita'],
          tecnico: f['Técnico'] ?? f['Tecnico'] ?? f['Technician'],
          notaTecnico: f['Nota técnico'] ?? f['Nota tecnico'] ?? f['Nota Técnico'] ?? f['Nota Tecnico'] ?? f['Observaciones técnico'],
          citaTecnico: f['Cita técnico'] ?? f['Cita tecnico'] ?? f['Cita Técnico'],
          fechaRegistro: f['Fecha de registro'] ?? f['Fecha'] ?? f['Created'] ?? r.createdTime,
          ultimoCambio: f['Último cambio'] ?? f['Ultima modificacion'] ?? f['Last Modified'] ?? f['Modified'] ?? r.createdTime,
          chatbot: f['Chatbot'],
        };
      });

      console.log('Airtable - Mapped records:', mappedRecords.length);
      return mappedRecords;
    } catch (error) {
      console.error('Error fetching services:', error);
      return [];
    }
  },

  // Actualizar comentarios de un servicio
  async updateServiceComments(serviceId: string, comentarios: string): Promise<void> {
    try {
      await serviciosApi.patch(`/Servicios/${serviceId}`, {
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
  async updateServiceStatus(serviceId: string, estado: string): Promise<void> {
    try {
      await serviciosApi.patch(`/Servicios/${serviceId}`, {
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
  async updateServiceField(serviceId: string, field: string, value: string): Promise<void> {
    try {
      const fieldMap: Record<string, string> = {
        estado: 'Estado',
        estadoIpas: 'Estado Ipas',
        comentarios: 'Comentarios',
        tecnico: 'Técnico',
        notaTecnico: 'Nota técnico',
        cita: 'Cita',
        citaTecnico: 'Cita técnico',
        trabajadores: 'Trabajadores',
      };
      
      const airtableField = fieldMap[field] || field;
      
      await serviciosApi.patch(`/Servicios/${serviceId}`, {
        fields: {
          [airtableField]: value,
        },
      });
    } catch (error) {
      console.error(`Error updating service field ${field}:`, error);
      throw error;
    }
  },

  // Actualizar campo linked records de un servicio (para arrays)
  async updateServiceLinkedField(serviceId: string, field: string, value: string[]): Promise<void> {
    try {
      await serviciosApi.patch(`/Servicios/${serviceId}`, {
        fields: {
          [field]: value,
        },
      });
    } catch (error) {
      console.error(`Error updating service linked field ${field}:`, error);
      throw error;
    }
  },

  // Obtener técnicos desde Airtable
  async getTechnicians(): Promise<import('../types').Tecnico[]> {
    try {
      const records = await fetchAllServicios('Técnicos', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          nombre: f['Nombre'] ?? f['Name'],
          provincia: f['Provincia'] ?? f['Province'],
          estado: f['Estado'] ?? f['Status'],
          telefono: f['Teléfono'] ?? f['Telefono'] ?? f['Phone'],
          observaciones: f['Observaciones'] ?? f['Observacion'] ?? f['Notes'],
        };
      });
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

  // Obtener recursos (tabla "Recursos")
  async getResources(): Promise<{
    id: string;
    name: string;
    description?: string;
    fileUrl?: string;
    fileName?: string;
    imageUrl?: string;
    roles?: string[]; // Campo multiselect de roles
    enlace?: string; // Nuevo campo para enlace de video
  }[]> {
    try {
      const records = await fetchAllServicios('Recursos', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        const file = Array.isArray(f['Archivo'] ?? f['File']) ? (f['Archivo'] ?? f['File'])[0] : undefined;
        const photo = Array.isArray(f['Foto'] ?? f['Photo']) ? (f['Foto'] ?? f['Photo'])[0] : undefined;
        
        // Obtener el campo Rol (multiselect)
        let roles: string[] | undefined;
        if (Array.isArray(f['Rol'])) {
          roles = f['Rol'];
        } else if (Array.isArray(f['Role'])) {
          roles = f['Role'];
        } else if (Array.isArray(f['Roles'])) {
          roles = f['Roles'];
        }
        
        return {
          id: r.id,
          name: f['Nombre'] ?? f['Name'] ?? 'Recurso',
          description: f['Descripción'] ?? f['Descripcion'] ?? f['Description'],
          fileUrl: file?.url,
          fileName: file?.filename,
          imageUrl: photo?.url,
          roles: roles,
          enlace: f['Enlace'] ?? f['Link'], // Nuevo campo enlace
        };
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  },
};   