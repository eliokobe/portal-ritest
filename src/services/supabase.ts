import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. tramitaciones tracking will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
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
  private isEnabled(): boolean {
    return supabase !== null;
  }

  /**
   * Crear un registro cuando un expediente entra en tramitaciones
   */
  async createTramitacion(numero: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Verificar si ya existe un registro para este número sin fecha de tramitación
      const { data: existing } = await supabase!
        .from('tramitaciones')
        .select('id, tramitación')
        .eq('número', numero)
        .is('tramitación', null)
        .single();

      // Si ya existe un registro sin tramitar, no crear uno nuevo
      if (existing) {
        console.log(`Tramitación ya existe para número ${numero}, omitiendo creación`);
        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('tramitaciones')
        .insert({
          número: numero,
        });

      if (error) {
        console.error('Error creating tramitacion:', error);
      } else {
        console.log(`Tramitación creada para número ${numero}`);
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
  async trackTramitacion(numero: string, fechaCreacion?: string, fechaTramitacion?: string): Promise<void> {
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

      console.log(`[Supabase] Tracking tramitación: ${numero}`, {
        fechaCreacionOriginal: fechaCreacion,
        fechaCreacionAjustada: creacionDate,
        fechaTramitacionOriginal: fechaTramitacion,
        fechaTramitacionAjustada: tramitacionDate
      });

      // Buscar registro existente sin tramitar
      const { data: existing } = await supabase!
        .from('tramitaciones')
        .select('id')
        .eq('número', numero)
        .is('tramitación', null)
        .order('creación', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Actualizar registro existente con la fecha de tramitación
        const { error } = await supabase!
          .from('tramitaciones')
          .update({
            tramitación: tramitacionDate,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating existing tramitacion:', error);
        } else {
          console.log(`Tramitación actualizada para número ${numero}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        // creación = Fecha cierre (cuando entró en tramitaciones)
        // tramitación = Fecha actual (cuando se cambió Ipartner)
        const { error } = await supabase!
          .from('tramitaciones')
          .insert({
            número: numero,
            creación: creacionDate,
            tramitación: tramitacionDate,
          });

        if (error) {
          console.error('Error creating tramitacion record:', error);
        } else {
          console.log(`Tramitación trackeada para número ${numero}`);
        }
      }
    } catch (error) {
      console.error('Error in trackTramitacion:', error);
    }
  }

  /**
   * Actualizar la fecha de tramitación cuando se marca como tramitado
   */
  async completeTramitacion(numero: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Buscar el registro más reciente sin fecha de tramitación
      const { data: records } = await supabase!
        .from('tramitaciones')
        .select('id')
        .eq('número', numero)
        .is('tramitación', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {
        console.log(`No se encontró tramitación pendiente para número ${numero}`);
        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitación
      const { error } = await supabase!
        .from('tramitaciones')
        .update({
          tramitación: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating tramitacion:', error);
      } else {
        console.log(`Tramitación completada para número ${numero}`);
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
  async createRecogida(numero: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Verificar si ya existe un registro para este número sin fecha de envío
      const { data: existing } = await supabase!
        .from('recogidas')
        .select('id, enviado')
        .eq('número', numero)
        .is('enviado', null)
        .single();

      // Si ya existe un registro sin enviar, no crear uno nuevo
      if (existing) {
        console.log(`Recogida ya existe para número ${numero}, omitiendo creación`);
        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('recogidas')
        .insert({
          número: numero,
        });

      if (error) {
        console.error('Error creating recogida:', error);
      } else {
        console.log(`Recogida creada para número ${numero}`);
      }
    } catch (error) {
      console.error('Error in createRecogida:', error);
    }
  }

  /**
   * Actualizar la fecha de envío cuando se marca como "Recogida enviada"
   */
  async completeRecogida(numero: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Buscar el registro más reciente sin fecha de envío
      const { data: records } = await supabase!
        .from('recogidas')
        .select('id')
        .eq('número', numero)
        .is('enviado', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {
        console.log(`No se encontró recogida pendiente para número ${numero}`);
        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de envío
      const { error } = await supabase!
        .from('recogidas')
        .update({
          enviado: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating recogida:', error);
      } else {
        console.log(`Recogida completada para número ${numero}`);
      }
    } catch (error) {
      console.error('Error in completeRecogida:', error);
    }
  }

  /**
   * Trackear recogida completa (crear registro con ambas fechas o actualizar si existe)
   * @param numero - Número del envío
   * @param fechaCreacion - Fecha de creación (cuando entró en estado de recogida)
   * @param fechaEnviado - Fecha de envío (cuando se marcó como recogida enviada)
   */
  async trackRecogida(numero: string, fechaCreacion?: string, fechaEnviado?: string): Promise<void> {
    console.log('[Supabase.trackRecogida] Llamado con:', { numero, fechaCreacion, fechaEnviado });
    
    if (!this.isEnabled()) {
      console.warn('[Supabase.trackRecogida] Supabase no está habilitado');
      return;
    }

    try {
      const enviadoDate = fechaEnviado ? new Date(fechaEnviado).toISOString() : new Date().toISOString();
      const creacionDate = fechaCreacion ? new Date(fechaCreacion).toISOString() : new Date().toISOString();

      console.log(`[Supabase] Tracking recogida: ${numero}`, {
        fechaCreacion: creacionDate,
        fechaEnviado: enviadoDate
      });

      // Buscar registro existente sin enviar
      const { data: existing } = await supabase!
        .from('recogidas')
        .select('id')
        .eq('número', numero)
        .is('enviado', null)
        .order('creación', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        // Actualizar registro existente con la fecha de envío
        const { error } = await supabase!
          .from('recogidas')
          .update({
            enviado: enviadoDate,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[Supabase] Error updating existing recogida:', error);
        } else {
          console.log(`[Supabase] Recogida actualizada para número ${numero}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        const { error } = await supabase!
          .from('recogidas')
          .insert({
            número: numero,
            creación: creacionDate,
            enviado: enviadoDate,
          });

        if (error) {
          console.error('[Supabase] Error creating recogida record:', error);
        } else {
          console.log(`[Supabase] Recogida trackeada para número ${numero}`);
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
  async trackAsesoramiento(numero: string, fechaCreacion?: string, fechaInforme?: string): Promise<void> {
    console.log('[Supabase.trackAsesoramiento] Llamado con:', { numero, fechaCreacion, fechaInforme });
    
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

      console.log(`[Supabase] Tracking asesoramiento: ${numero}`, {
        fechaCreacionOriginal: fechaCreacion,
        fechaCreacionAjustada: creacionDate,
        fechaInformeOriginal: fechaInforme,
        fechaInformeAjustada: informeDate
      });

      // Buscar registro existente sin fecha de informe
      const { data: existing } = await supabase!
        .from('asesoramientos')
        .select('id')
        .eq('número', numero)
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
          console.log(`[Supabase] Asesoramiento actualizado para número ${numero}`);
        }
      } else {
        // No existe registro previo, crear uno nuevo con ambas fechas
        const { error } = await supabase!
          .from('asesoramientos')
          .insert({
            número: numero,
            creación: creacionDate,
            informe: informeDate,
          });

        if (error) {
          console.error('[Supabase] Error creating asesoramiento record:', error);
        } else {
          console.log(`[Supabase] Asesoramiento trackeado para número ${numero}`);
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
}

export const supabaseService = new SupabaseService();
