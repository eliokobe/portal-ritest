import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase Config] URL:', supabaseUrl ? 'SET' : 'MISSING');
console.log('[Supabase Config] Key:', supabaseAnonKey ? 'SET' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. tramitaciones tracking will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'ritest-supabase-auth',
      }
    })
  : null;

export interface TramitacionRecord {
  id?: number;
  creación?: string;
  número?: string;
  tramitación?: string;
}

export interface AsesoramientoRecord {
  id?: number;
  creación?: string;
  número?: string;
  informe?: string;
}

class SupabaseService {
  public supabase = supabase;
  
  private isEnabled(): boolean {
    return supabase !== null;
  }

  /**
   * Crear un registro cuando un expediente entra en tramitaciones
   */
  async createTramitacion(número: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Verificar si ya existe un registro para este número sin fecha de tramitación
      const { data: existing } = await supabase!
        .from('tramitaciones')
        .select('id, tramitación')
        .eq('número', número)
        .is('tramitación', null)
        .single();

      // Si ya existe un registro sin tramitar, no crear uno nuevo
      if (existing) {
        console.log(`Tramitación ya existe para número ${número}, omitiendo creación`);
        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('tramitaciones')
        .insert({
          número: número,
        });

      if (error) {
        console.error('Error creating tramitación:', error);
      } else {
        console.log(`Tramitación creada para número ${número}`);
      }
    } catch (error) {
      console.error('Error in createTramitacion:', error);
    }
  }

  /**
   * Trackear tramitación completa (crear registro con ambas fechas o actualizar si existe)
   * Este método se llama cuando se marca como tramitado o se cambia Ipartner
   * @param numero - Número de expediente
   * @param fechaCreacion - Fecha cierre de Airtable (timezone Madrid UTC+1, formato ISO)
   * @param fechaTramitacion - Fecha de tramitación (timestamp actual)
   */
  async trackTramitacion(número: string, fechaCreacion?: string, fechaTramitacion?: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Sumar 1 hora a ambas fechas para ajustar a la hora de Madrid
      const addOneHour = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 1);
        return date.toISOString();
      };

      const tramitacionDate = fechaTramitacion ? addOneHour(fechaTramitacion) : addOneHour(new Date().toISOString());
      const creacionDate = fechaCreacion ? addOneHour(fechaCreacion) : addOneHour(new Date().toISOString());

      console.log(`[Supabase] Tracking tramitación: ${número}`, {
        fechaCreacionOriginal: fechaCreacion,
        fechaCreacionAjustada: creacionDate,
        fechaTramitacionOriginal: fechaTramitacion,
        fechaTramitacionAjustada: tramitacionDate
      });

      // Buscar registro existente sin tramitar
      const { data: existing, error: selectError } = await supabase!
        .from('tramitaciones')
        .select('id')
        .eq('número', número)
        .is('tramitación', null)
        .order('creación', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (selectError) {
        console.error('Error buscando tramitación existente:', selectError);
      }

      if (existing) {
        // Actualizar registro existente con la fecha de tramitación
        const { error } = await supabase!
          .from('tramitaciones')
          .update({
            tramitación: tramitacionDate,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating existing tramitación:', error);
        } else {
          console.log(`Tramitación actualizada para número ${número}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        // creación = Fecha cierre (cuando entró en tramitaciones)
        // tramitación = Fecha actual (cuando se cambió Ipartner)
        const { error } = await supabase!
          .from('tramitaciones')
          .insert({
            número: número,
            creación: creacionDate,
            tramitación: tramitacionDate,
          });

        if (error) {
          console.error('Error creating tramitacion record:', error);
        } else {
          console.log(`Tramitación trackeada para número ${número}`);
        }
      }
    } catch (error) {
      console.error('Error in trackTramitacion:', error);
    }
  }

  /**
   * Actualizar la fecha de tramitación cuando se marca como tramitado
   */
  async completeTramitacion(número: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Buscar el registro más reciente sin fecha de tramitación
      const { data: records } = await supabase!
        .from('tramitaciones')
        .select('id')
        .eq('número', número)
        .is('tramitación', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {
        console.log(`No se encontró tramitación pendiente para número ${número}`);
        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitación (+1 hora para Madrid)
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const { error } = await supabase!
        .from('tramitaciones')
        .update({
          tramitación: now.toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating tramitación:', error);
      } else {
        console.log(`Tramitación completada para número ${número}`);
      }
    } catch (error) {
      console.error('Error in completeTramitacion:', error);
    }
  }

  /**
   * Obtener estadísticas de tiempo de tramitación desde Supabase
   */
  async getTramitacionStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    if (!this.isEnabled()) {
      return { dailyData: [] };
    }

    try {
      // Obtener todos los registros con duración decimal
      const { data: records, error } = await supabase!
        .from('tramitaciones')
        .select('creación, duracion_decimal')
        .not('duracion_decimal', 'is', null)
        .order('creación', { ascending: true });

      if (error) {
        console.error('Error fetching tramitacion stats:', error);
        return { dailyData: [] };
      }

      if (!records || records.length === 0) {
        return { dailyData: [] };
      }

      // Obtener el mes y año actual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Agrupar por día de creación
      const groupedByDay: Record<string, { totalHours: number; count: number }> = {};

      records.forEach((record: any) => {
        const creacion = new Date(record.creación);
        const duracionDecimal = record.duracion_decimal;

        // Validar fecha y duración
        if (isNaN(creacion.getTime()) || duracionDecimal == null || duracionDecimal < 0) {
          return;
        }

        // Solo incluir registros del mes actual
        const esDelMesActual = creacion.getMonth() === currentMonth && creacion.getFullYear() === currentYear;
        
        // Solo incluir duraciones razonables (menos de 30 días = 720 horas) del mes actual
        if (esDelMesActual && duracionDecimal > 0 && duracionDecimal < 720) {
          // Agrupar por día de creación
          const dayKey = creacion.toISOString().split('T')[0];

          if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = { totalHours: 0, count: 0 };
          }

          groupedByDay[dayKey].totalHours += duracionDecimal;
          groupedByDay[dayKey].count++;
        }
      });

      // Convertir a array y calcular promedios
      const dailyData = Object.entries(groupedByDay)
        .map(([date, data]) => ({
          date,
          avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
          count: data.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { dailyData };
    } catch (error) {
      console.error('Error in getTramitacionStats:', error);
      return { dailyData: [] };
    }
  }

  /**
   * Obtener estadísticas de tiempo de recogida desde Supabase
   */
  async getRecogidaStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    console.log('[Supabase.getRecogidaStats] Iniciando obtención de estadísticas de recogidas...');
    
    if (!this.isEnabled()) {
      console.warn('[Supabase.getRecogidaStats] Supabase no está habilitado');
      return { dailyData: [] };
    }

    try {
      // Obtener todos los registros con duración decimal
      console.log('[Supabase.getRecogidaStats] Consultando tabla recogidas...');
      const { data: records, error } = await supabase!
        .from('recogidas')
        .select('creación, duracion_decimal')
        .not('duracion_decimal', 'is', null)
        .order('creación', { ascending: true });

      if (error) {
        console.error('[Supabase.getRecogidaStats] Error fetching recogida stats:', error);
        return { dailyData: [] };
      }

      console.log(`[Supabase.getRecogidaStats] Registros obtenidos: ${records?.length || 0}`);

      if (!records || records.length === 0) {
        console.log('[Supabase.getRecogidaStats] No hay registros de recogidas');
        return { dailyData: [] };
      }

      // Obtener el mes y año actual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Agrupar por día de creación
      const groupedByDay: Record<string, { totalHours: number; count: number }> = {};

      records.forEach((record: any) => {
        const creacion = new Date(record.creación);
        const duracionDecimal = record.duracion_decimal;

        // Validar fecha y duración
        if (isNaN(creacion.getTime()) || duracionDecimal == null || duracionDecimal < 0) {
          return;
        }

        // Solo incluir registros del mes actual
        const esDelMesActual = creacion.getMonth() === currentMonth && creacion.getFullYear() === currentYear;

        // Solo incluir duraciones razonables (menos de 30 días = 720 horas) del mes actual
        if (esDelMesActual && duracionDecimal > 0 && duracionDecimal < 720) {
          // Agrupar por día de creación
          const dayKey = creacion.toISOString().split('T')[0];

          if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = { totalHours: 0, count: 0 };
          }

          groupedByDay[dayKey].totalHours += duracionDecimal;
          groupedByDay[dayKey].count++;
        }
      });

      // Convertir a array y calcular promedios
      const dailyData = Object.entries(groupedByDay)
        .map(([date, data]) => ({
          date,
          avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
          count: data.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`[Supabase.getRecogidaStats] Datos procesados: ${dailyData.length} días con datos`);
      
      return { dailyData };
    } catch (error) {
      console.error('[Supabase.getRecogidaStats] Error in getRecogidaStats:', error);
      return { dailyData: [] };
    }
  }

  /**
   * Verificar múltiples números y crear registros para los que no existen
   */
  async ensureTramitaciones(numeros: string[]): Promise<void> {
    if (!this.isEnabled() || numeros.length === 0) return;

    try {
      // Obtener registros existentes sin tramitar
      const { data: existing } = await supabase!
        .from('tramitaciones')
        .select('número')
        .in('número', numeros)
        .is('tramitación', null);

      const existingNumeros = new Set(existing?.map((r: any) => r.número) || []);
      const newNumeros = numeros.filter(n => !existingNumeros.has(n));

      if (newNumeros.length > 0) {
        const { error } = await supabase!
          .from('tramitaciones')
          .insert(newNumeros.map(numero => ({ número: numero })));

        if (error) {
          console.error('Error creating multiple tramitaciones:', error);
        } else {
          console.log(`Creadas ${newNumeros.length} tramitaciones nuevas`);
        }
      }
    } catch (error) {
      console.error('Error in ensureTramitaciones:', error);
    }
  }

  /**
   * Crear un registro cuando un envío entra en estado de recogida
   */
  async createRecogida(número: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Verificar si ya existe un registro para este número sin fecha de tramitado
      const { data: existing } = await supabase!
        .from('recogidas')
        .select('id, enviado')
        .eq('número', número)
        .is('tramitado', null)
        .single();

      // Si ya existe un registro sin tramitar, no crear uno nuevo
      if (existing) {
        console.log(`Recogida ya existe para número ${número}, omitiendo creación`);
        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('recogidas')
        .insert({
          número: número,
        });

      if (error) {
        console.error('Error creating recogida:', error);
      } else {
        console.log(`Recogida creada para número ${número}`);
      }
    } catch (error) {
      console.error('Error in createRecogida:', error);
    }
  }

  /**
   * Actualizar la fecha de tramitado cuando se marca como "Recogida enviada"
   */
  async completeRecogida(número: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Buscar el registro más reciente sin fecha de tramitado
      const { data: records } = await supabase!
        .from('recogidas')
        .select('id')
        .eq('número', número)
        .is('tramitado', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {
        console.log(`No se encontró recogida pendiente para número ${número}`);
        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitado (+1 hora para Madrid)
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const { error } = await supabase!
        .from('recogidas')
        .update({
          tramitado: now.toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating recogida:', error);
      } else {
        console.log(`Recogida completada para número ${número}`);
      }
    } catch (error) {
      console.error('Error in completeRecogida:', error);
    }
  }

  /**
   * Trackear recogida completa (crear registro con ambas fechas o actualizar si existe)
   * @param numero - Número del envío
   * @param fechaCreacion - Fecha de creación (cuando entró en estado de recogida)
   * @param fechaTramitado - Fecha de envío (cuando se marcó como recogida enviada)
   */
  async trackRecogida(número: string, fechaCreacion?: string, fechaTramitado?: string): Promise<void> {
    console.log('[Supabase.trackRecogida] Llamado con:', { número, fechaCreacion, fechaTramitado });
    
    if (!this.isEnabled()) {
      console.warn('[Supabase.trackRecogida] Supabase no está habilitado');
      return;
    }

    try {
      // Sumar 1 hora a ambas fechas para ajustar a la hora de Madrid
      const addOneHour = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 1);
        return date.toISOString();
      };

      const tramitadoDate = fechaTramitado ? addOneHour(fechaTramitado) : addOneHour(new Date().toISOString());
      const creacionDate = fechaCreacion ? addOneHour(fechaCreacion) : addOneHour(new Date().toISOString());

      console.log(`[Supabase] Tracking recogida: ${número}`, {
        fechaCreacionOriginal: fechaCreacion,
        fechaCreacionAjustada: creacionDate,
        fechaTramitadoOriginal: fechaTramitado,
        fechaTramitadoAjustada: tramitadoDate
      });

      // Buscar registro existente sin tramitar
      const { data: existing } = await supabase!
        .from('recogidas')
        .select('id')
        .eq('número', número)
        .is('tramitado', null)
        .order('creación', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Actualizar registro existente con la fecha de tramitado
        const { error } = await supabase!
          .from('recogidas')
          .update({
            tramitado: tramitadoDate,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Supabase] Error updating existing recogida:', error);
        } else {
          console.log(`[Supabase] Recogida actualizada para número ${número}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        const { error } = await supabase!
          .from('recogidas')
          .insert({
            número: número,
            creación: creacionDate,
            tramitado: tramitadoDate,
          });

        if (error) {
          console.error('[Supabase] Error creating recogida record:', error);
        } else {
          console.log(`[Supabase] Recogida trackeada para número ${número}`);
        }
      }
    } catch (error) {
      console.error('[Supabase] Error in trackRecogida:', error);
    }
  }

  /**
   * Trackear asesoramiento completo (crear registro con ambas fechas)
   * Este método se llama cuando un registro en Asesoramientos se marca como Informe, Ilocalizable o No interesado
   * @param numero - Número del expediente del registro
   * @param fechaCreacion - Fecha de creación del registro en Airtable (columna "Creación")
   * @param fechaInforme - Fecha cuando se marca el estado (timestamp actual)
   */
  async trackAsesoramiento(número: string, fechaCreacion?: string, fechaInforme?: string): Promise<void> {
    console.log('[Supabase.trackAsesoramiento] Llamado con:', { número, fechaCreacion, fechaInforme });
    
    if (!this.isEnabled()) {
      console.warn('[Supabase.trackAsesoramiento] Supabase no está habilitado');
      return;
    }

    try {
      // Sumar 1 hora a ambas fechas para ajustar a la hora de Madrid
      const addOneHour = (dateStr: string): string => {
        const date = new Date(dateStr);
        date.setHours(date.getHours() + 1);
        return date.toISOString();
      };

      const informeDate = fechaInforme ? addOneHour(fechaInforme) : addOneHour(new Date().toISOString());
      const creacionDate = fechaCreacion ? addOneHour(fechaCreacion) : addOneHour(new Date().toISOString());

      console.log(`[Supabase] Tracking asesoramiento: ${número}`, {
        fechaCreacionOriginal: fechaCreacion,
        fechaCreacionAjustada: creacionDate,
        fechaInformeOriginal: fechaInforme,
        fechaInformeAjustada: informeDate
      });

      // Buscar registro existente sin fecha de informe
      const { data: existing } = await supabase!
        .from('asesoramientos')
        .select('id')
        .eq('número', número)
        .is('informe', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const recordId = existing[0].id;
        // Actualizar registro existente con la fecha de informe
        const { error } = await supabase!
          .from('asesoramientos')
          .update({
            informe: informeDate,
          })
          .eq('id', recordId);

        if (error) {
          console.error('[Supabase] Error updating existing asesoramiento:', error);
        } else {
          console.log(`[Supabase] Asesoramiento actualizado para número ${número}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        const { error } = await supabase!
          .from('asesoramientos')
          .insert({
            número: número,
            creación: creacionDate,
            informe: informeDate,
          });

        if (error) {
          console.error('[Supabase] Error creating asesoramiento record:', error);
        } else {
          console.log(`[Supabase] Asesoramiento trackeado para número ${número}`);
        }
      }
    } catch (error) {
      console.error('[Supabase] Error in trackAsesoramiento:', error);
    }
  }

  /**
   * Obtener estadísticas de tiempo de asesoramientos desde Supabase
   */
  async getAsesoramientoStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {
    console.log('[Supabase.getAsesoramientoStats] Iniciando obtención de estadísticas de asesoramientos...');
    
    if (!this.isEnabled()) {
      console.warn('[Supabase.getAsesoramientoStats] Supabase no está habilitado');
      return { dailyData: [] };
    }

    try {
      // Obtener todos los registros con duración decimal
      console.log('[Supabase.getAsesoramientoStats] Consultando tabla asesoramientos...');
      const { data: records, error } = await supabase!
        .from('asesoramientos')
        .select('creación, duracion_decimal')
        .not('duracion_decimal', 'is', null)
        .order('creación', { ascending: true });

      if (error) {
        console.error('[Supabase.getAsesoramientoStats] Error fetching asesoramiento stats:', error);
        return { dailyData: [] };
      }

      console.log(`[Supabase.getAsesoramientoStats] Registros obtenidos: ${records?.length || 0}`);

      if (!records || records.length === 0) {
        console.log('[Supabase.getAsesoramientoStats] No hay registros de asesoramientos');
        return { dailyData: [] };
      }

      // Obtener el mes y año actual
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Agrupar por día de creación
      const groupedByDay: Record<string, { totalHours: number; count: number }> = {};

      records.forEach((record: any) => {
        const creacion = new Date(record.creación);
        const duracionDecimal = record.duracion_decimal;

        // Validar fecha y duración
        if (isNaN(creacion.getTime()) || duracionDecimal == null || duracionDecimal < 0) {
          return;
        }

        // Solo incluir registros del mes actual
        const esDelMesActual = creacion.getMonth() === currentMonth && creacion.getFullYear() === currentYear;

        // Solo incluir duraciones razonables (menos de 30 días = 720 horas) del mes actual
        if (esDelMesActual && duracionDecimal > 0 && duracionDecimal < 720) {
          // Agrupar por día de creación
          const dayKey = creacion.toISOString().split('T')[0];

          if (!groupedByDay[dayKey]) {
            groupedByDay[dayKey] = { totalHours: 0, count: 0 };
          }

          groupedByDay[dayKey].totalHours += duracionDecimal;
          groupedByDay[dayKey].count++;
        }
      });

      // Convertir a array y calcular promedios
      const dailyData = Object.entries(groupedByDay)
        .map(([date, data]) => ({
          date,
          avgHours: Math.round((data.totalHours / data.count) * 10) / 10,
          count: data.count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`[Supabase.getAsesoramientoStats] Datos procesados: ${dailyData.length} días con datos`);
      
      return { dailyData };
    } catch (error) {
      console.error('[Supabase.getAsesoramientoStats] Error in getAsesoramientoStats:', error);
      return { dailyData: [] };
    }
  }

  /**
   * Obtener porcentaje de casos gestionados en 24h por semana
   */
  async getCasosGestionados24h(): Promise<{
    weeklyData: { week: string; percentage24h: number; totalCases: number }[];
  }> {
    if (!this.isEnabled()) {
      console.warn('[Supabase.getCasosGestionados24h] Supabase no disponible');
      return { weeklyData: [] };
    }

    try {
      console.log('[Supabase.getCasosGestionados24h] Obteniendo datos de resoluciones_remotas...');
      
      // Primera semana completa de 2026: lunes 5 de enero
      const firstMonday2026 = new Date('2026-01-05T00:00:00');
      
      // Obtener todos los registros de la tabla resoluciones_remotas
      const { data: records, error } = await supabase!
        .from('resoluciones_remotas')
        .select('*')
        .gte('creación', firstMonday2026.toISOString())
        .order('creación', { ascending: true });

      if (error) {
        console.error('[Supabase.getCasosGestionados24h] Error al obtener datos:', error);
        return { weeklyData: [] };
      }

      console.log(`[Supabase.getCasosGestionados24h] Registros obtenidos: ${records?.length || 0}`);

      if (!records || records.length === 0) {
        return { weeklyData: [] };
      }

      // Función para obtener el inicio de la semana (lunes)
      const getWeekStart = (date: Date): string => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        
        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const dayStr = String(monday.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      };

      // Generar semanas desde la primera semana completa hasta ahora
      const now = new Date();
      const weekKeys: string[] = [];
      let currentMonday = new Date(firstMonday2026);
      
      while (currentMonday <= now) {
        const year = currentMonday.getFullYear();
        const month = String(currentMonday.getMonth() + 1).padStart(2, '0');
        const day = String(currentMonday.getDate()).padStart(2, '0');
        weekKeys.push(`${year}-${month}-${day}`);
        
        currentMonday = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Mapas para contar casos por semana
      const weekDataMap = new Map(weekKeys.map(k => [k, { within24h: 0, total: 0 }]));

      records.forEach((record: any) => {
        const creación = record.creación ? new Date(record.creación) : null;
        const resolución = record.resolución ? new Date(record.resolución) : null;
        const número = record.número; // Número de Airtable

        if (creación && resolución && creación >= firstMonday2026 && número) {
          const weekStart = getWeekStart(creación);

          if (weekDataMap.has(weekStart)) {
            const data = weekDataMap.get(weekStart)!;
            data.total++;

            // Calcular diferencia en horas
            const diffMs = resolución.getTime() - creación.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Si la resolución fue en menos de 24 horas
            if (diffHours <= 24) {
              data.within24h++;
            }
          }
        }
      });

      // Calcular porcentajes por semana
      const weeklyData = weekKeys.map(weekStart => {
        const data = weekDataMap.get(weekStart)!;
        const percentage24h = data.total > 0 
          ? Math.round((data.within24h / data.total) * 100) 
          : 0;
        
        return {
          week: weekStart,
          percentage24h,
          totalCases: data.total,
        };
      });

      console.log('[Supabase.getCasosGestionados24h] Datos procesados:', weeklyData);
      
      return { weeklyData };
    } catch (error) {
      console.error('[Supabase.getCasosGestionados24h] Error:', error);
      return { weeklyData: [] };
    }
  }

  /**
   * Crear un registro de resolución cuando se resuelve un caso
   * @param numero - Número de expediente
   * @param fechaCreacion - Fecha de creación del caso (desde Airtable)
   */
  async createResolutionRecord(numero: string, fechaCreacion?: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const resolucionDate = new Date().toISOString();
      const creacionDate = fechaCreacion || new Date().toISOString();

      console.log(`[Supabase] Creando registro de resolución: ${numero}`, {
        creación: creacionDate,
        resolución: resolucionDate
      });

      const { error } = await supabase!
        .from('resoluciones_remotas')
        .insert({
          número: numero,
          creación: creacionDate,
          resolución: resolucionDate
        });

      if (error) {
        console.error('[Supabase] Error creando registro de resolución:', error);
      } else {
        console.log(`[Supabase] Registro de resolución creado para ${numero}`);
      }
    } catch (error) {
      console.error('[Supabase] Error en createResolutionRecord:', error);
    }
  }

  /**
   * Obtener registros de resolución del mes actual
   * @param monthStart - Fecha de inicio del mes
   */
  async getResolutionRecordsByMonth(monthStart: Date): Promise<any[]> {
    if (!this.isEnabled()) return [];

    try {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      
      console.log(`[Supabase] Obteniendo registros de resolución desde ${monthStart.toISOString()} hasta ${monthEnd.toISOString()}`);

      const { data: records, error } = await supabase!
        .from('resoluciones_remotas')
        .select('*')
        .gte('resolución', monthStart.toISOString())
        .lte('resolución', monthEnd.toISOString())
        .not('número', 'is', null);

      if (error) {
        console.error('[Supabase] Error obteniendo registros de resolución:', error);
        return [];
      }

      console.log(`[Supabase] Registros de resolución obtenidos: ${records?.length || 0}`);
      return records || [];
    } catch (error) {
      console.error('[Supabase] Error en getResolutionRecordsByMonth:', error);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
