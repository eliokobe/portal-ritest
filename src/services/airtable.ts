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
        const logoField = record.fields.Logo;
        let logoUrl: string | undefined;
        if (Array.isArray(logoField) && logoField.length > 0) {
          const first = logoField[0];
          logoUrl = (first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.full?.url) as string | undefined;
        }
        return {
          id: record.id,
          email: record.fields.Email,
          name: record.fields.Nombre || record.fields.Name,
          phone: record.fields.Teléfono || record.fields.Phone,
          clinic: record.fields.Empresa || record.fields.Clinic,
          role: record.fields.Cargo || record.fields.Role,
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
          let fechaValue = fields['Fecha de registro'] ||
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
  async getServices(clinic?: string): Promise<{
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
    tecnico?: string;
    notaTecnico?: string;
    fechaRegistro?: string;
    ultimoCambio?: string;
  }[]> {
    try {
      const params: Record<string, any> = {};

      if (clinic) {
        const clinicEsc = String(clinic).replace(/'/g, "\\'");
        params.filterByFormula = `OR({Empresa} = '${clinicEsc}', {Clinic} = '${clinicEsc}', {Cliente} = '${clinicEsc}')`;
      }

      const records = await fetchAllServicios('Servicios', { ...params, pageSize: 100 });

      return records.map((r: any) => {
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
          tecnico: f['Técnico'] ?? f['Tecnico'] ?? f['Technician'],
          notaTecnico: f['Nota técnico'] ?? f['Nota tecnico'] ?? f['Nota Técnico'] ?? f['Nota Tecnico'] ?? f['Observaciones técnico'],
          fechaRegistro: f['Fecha de registro'] ?? f['Fecha'] ?? f['Created'] ?? r.createdTime,
          ultimoCambio: f['Último cambio'] ?? f['Ultima modificacion'] ?? f['Last Modified'] ?? f['Modified'] ?? r.createdTime,
        };
      });
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
  }[]> {
    try {
      const records = await fetchAllServicios('Recursos', { pageSize: 100 });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        const file = Array.isArray(f['Archivo'] ?? f['File']) ? (f['Archivo'] ?? f['File'])[0] : undefined;
        const photo = Array.isArray(f['Foto'] ?? f['Photo']) ? (f['Foto'] ?? f['Photo'])[0] : undefined;
        return {
          id: r.id,
          name: f['Nombre'] ?? f['Name'] ?? 'Recurso',
          description: f['Descripción'] ?? f['Descripcion'] ?? f['Description'],
          fileUrl: file?.url,
          fileName: file?.filename,
          imageUrl: photo?.url,
        };
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  },

  // Obtener registros (segunda base de Airtable)
  async getRegistros(): Promise<Registro[]> {
    try {
      const records = await fetchAllRegistros('Registros', { 
        filterByFormula: `{Activo} = 1`,
        pageSize: 100 
      });
      return records.map((r: any) => {
        const f = r.fields ?? {};
        return {
          id: r.id,
          contrato: f['Contrato'],
          nombre: f['Nombre'],
          telefono: f['Teléfono'] ?? f['Telefono'],
          direccion: f['Dirección'] ?? f['Direccion'],
          email: f['Email'],
          estado: f['Estado'],
          fecha: f['Fecha'] ? new Date(f['Fecha']).toISOString() : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching registros:', error);
      return [];
    }
  },

  // Crear nuevo registro
  async createRegistro(registro: Omit<Registro, 'id'>): Promise<Registro> {
    try {
      const response = await registrosApi.post('/Registros', {
        records: [{
          fields: {
            'Contrato': registro.contrato,
            'Nombre': registro.nombre || '',
            'Teléfono': registro.telefono || '',
            'Dirección': registro.direccion || '',
            'Email': registro.email || '',
            'Estado': registro.estado || '',
            'Fecha': registro.fecha ? new Date(registro.fecha).toISOString() : new Date().toISOString(),
          }
        }]
      });

      const createdRecord = response.data.records[0];
      const f = createdRecord.fields;
      return {
        id: createdRecord.id,
        contrato: f['Contrato'],
        nombre: f['Nombre'],
        telefono: f['Teléfono'],
        direccion: f['Dirección'],
        email: f['Email'],
        estado: f['Estado'],
        fecha: f['Fecha'] ? new Date(f['Fecha']).toISOString() : undefined,
      };
    } catch (error) {
      console.error('Error creating registro:', error);
      throw new Error('Error al crear el registro');
    }
  },

  // Actualizar registro
  async updateRegistro(registroId: string, updates: Partial<Omit<Registro, 'id'>>): Promise<void> {
    try {
      const fields: Record<string, any> = {};
      if (updates.contrato !== undefined) fields['Contrato'] = updates.contrato;
      if (updates.nombre !== undefined) fields['Nombre'] = updates.nombre;
      if (updates.telefono !== undefined) fields['Teléfono'] = updates.telefono;
      if (updates.direccion !== undefined) fields['Dirección'] = updates.direccion;
      if (updates.email !== undefined) fields['Email'] = updates.email;
      if (updates.estado !== undefined) fields['Estado'] = updates.estado;
      if (updates.fecha !== undefined) fields['Fecha'] = new Date(updates.fecha).toISOString();

      await registrosApi.patch(`/Registros/${registroId}`, { fields });
    } catch (error) {
      console.error('Error updating registro:', error);
      throw error;
    }
  },

  // Eliminar registro
  async deleteRegistro(registroId: string): Promise<void> {
    try {
      await registrosApi.delete(`/Registros/${registroId}`);
    } catch (error) {
      console.error('Error deleting registro:', error);
      throw error;
    }
  },

  // Obtener formulario por expediente
  async getFormularioByExpediente(expediente: string): Promise<any | null> {
    try {
      const expedienteEsc = String(expediente).replace(/'/g, "\\'");
      const params = {
        filterByFormula: `{Expediente} = '${expedienteEsc}'`,
        maxRecords: 1,
      };
      
      const records = await fetchAllServicios('Formulario', params);
      
      if (records.length > 0) {
        const r = records[0];
        const f = r.fields ?? {};
        return {
          id: r.id,
          expediente: f['Expediente'],
          problema: f['Problema'],
          detalles: f['Detalles'] ?? f['Details'],
          // Archivos adjuntos (asumiendo que son campos de tipo Attachment)
          archivo1: f['Archivo 1'] ?? f['File 1'],
          archivo2: f['Archivo 2'] ?? f['File 2'],
          archivo3: f['Archivo 3'] ?? f['File 3'],
          // Fotos
          fotoGeneral: f['Foto general'] ?? f['Foto General'],
          fotoEtiqueta: f['Foto etiqueta'] ?? f['Foto Etiqueta'],
          fotoRoto: f['Foto roto'] ?? f['Foto Roto'],
          // Incluir todos los demás campos que pueda tener la tabla
          ...f,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching formulario:', error);
      return null;
    }
  },

  // Obtener reparaciones por expediente
  async getReparacionesByExpediente(expediente: string): Promise<any | null> {
    try {
      const expedienteEsc = String(expediente).replace(/'/g, "\\'");
      const params = {
        filterByFormula: `{Expediente} = '${expedienteEsc}'`,
        maxRecords: 1,
      };
      
      const records = await fetchAllServicios('Reparaciones', params);
      
      if (records.length > 0) {
        const r = records[0];
        const f = r.fields ?? {};
        return {
          id: r.id,
          expediente: f['Expediente'],
          tecnico: f['Técnico'] ?? f['Technician'],
          resultado: f['Resultado'] ?? f['Result'],
          reparacion: f['Reparación'] ?? f['Repair'],
          cuadroElectrico: f['Cuadro eléctrico'] ?? f['Cuadro electrico'],
          problema: f['Problema'] ?? f['Problem'],
          foto: f['Foto'] ?? f['Photo'],
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching reparaciones:', error);
      return null;
    }
  },

  // Actualizar campo de formulario
  async updateFormularioField(formId: string, field: string, value: any): Promise<void> {
    try {
      await serviciosApi.patch(`/Formulario/${formId}`, {
        fields: {
          [field]: value,
        },
      });
    } catch (error) {
      console.error(`Error updating formulario field ${field}:`, error);
      throw error;
    }
  },

  // Actualizar campo de reparaciones
  async updateReparacionField(repId: string, field: string, value: any): Promise<void> {
    try {
      await serviciosApi.patch(`/Reparaciones/${repId}`, {
        fields: {
          [field]: value,
        },
      });
    } catch (error) {
      console.error(`Error updating reparacion field ${field}:`, error);
      throw error;
    }
  },

  // Obtener tareas
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
          tarea: f['Tarea'] ?? f['Task'] ?? '',
          estado: f['Estado'] ?? f['Status'] ?? 'Pendiente',
          prioridad: f['Prioridad'] ?? f['Priority'],
          fechaLimite: f['Fecha límite'] ?? f['Fecha limite'] ?? f['Due Date'],
          notas: f['Notas'] ?? f['Notes'],
          fechaModificacion: f['Last Modified'] ?? r.createdTime,
        };
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  },

  // Crear nueva tarea
  async createTask(task: {
    tarea: string;
    estado: string;
    prioridad?: string;
    fechaLimite?: string;
    notas?: string;
  }): Promise<void> {
    try {
      await serviciosApi.post('/Tareas', {
        records: [{
          fields: {
            'Tarea': task.tarea,
            'Estado': task.estado,
            'Prioridad': task.prioridad,
            'Fecha límite': task.fechaLimite,
            'Notas': task.notas,
          }
        }]
      });
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Actualizar estado de una tarea
  async updateTaskStatus(taskId: string, estado: string): Promise<void> {
    try {
      await serviciosApi.patch(`/Tareas/${taskId}`, {
        fields: {
          'Estado': estado,
        },
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  },

  // Eliminar tarea
  async deleteTask(taskId: string): Promise<void> {
    try {
      await serviciosApi.delete(`/Tareas/${taskId}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },
};
