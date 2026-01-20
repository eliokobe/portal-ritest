import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;



if (!supabaseUrl || !supabaseAnonKey) {

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

        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('tramitaciones')
        .insert({
          número: número,
        });

      if (error) {

      } else {

      }
    } catch (error) {

    }
  }

  /**
   * Trackear tramitación completa (crear registro con ambas fechas o actualizar si existe)
   * Este método se llama cuando se marca como tramitado o se cambia Ipartner
   * @param numero - Número de expediente
   * @param fechaCreacion - Fecha cierre de Airtable (formato ISO)
   * @param fechaTramitacion - Fecha de tramitación (timestamp actual)
   */
  async trackTramitacion(número: string, fechaCreacion?: string, fechaTramitacion?: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      const getLocalTime = (dateStr?: string): string => {
        const date = dateStr ? new Date(dateStr) : new Date();
        return new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Madrid',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date).replace(' ', 'T');
      };

      const tramitacionDate = getLocalTime(fechaTramitacion);
      const creacionDate = getLocalTime(fechaCreacion);


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

        } else {

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

        } else {

        }
      }
    } catch (error) {

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

        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitación (Hora de Madrid)
      const nowMadrid = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date()).replace(' ', 'T');

      const { error } = await supabase!
        .from('tramitaciones')
        .update({
          tramitación: nowMadrid,
        })
        .eq('id', recordId);

      if (error) {

      } else {

      }
    } catch (error) {

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

      return { dailyData: [] };
    }
  }

  /**
   * Obtener estadísticas de tiempo de recogida desde Supabase
   */
  async getRecogidaStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {

    if (!this.isEnabled()) {

      return { dailyData: [] };
    }

    try {
      // Obtener todos los registros con duración decimal

      const { data: records, error } = await supabase!
        .from('recogidas')
        .select('creación, duracion_decimal')
        .not('duracion_decimal', 'is', null)
        .order('creación', { ascending: true });

      if (error) {

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

        } else {

        }
      }
    } catch (error) {

    }
  }

  /**
   * Verificar múltiples números y crear registros de recogida para los que no existen
   */
  async ensureRecogidas(numeros: string[]): Promise<void> {
    if (!this.isEnabled() || numeros.length === 0) return;

    try {
      // Convertir a números para la comparación con la BD
      const numerosAsNumbers = numeros.map(n => Number(n));
      
      // Obtener TODOS los registros existentes con estos números (tramitados o no)
      const { data: existing } = await supabase!
        .from('recogidas')
        .select('número')
        .in('número', numerosAsNumbers);

      const existingNumeros = new Set(existing?.map((r: any) => Number(r.número)) || []);
      const newNumeros = numerosAsNumbers.filter(n => !existingNumeros.has(n));

      if (newNumeros.length > 0) {
        const { error } = await supabase!
          .from('recogidas')
          .insert(newNumeros.map(numero => ({ número: numero, tramitado: null })));

        if (error) {

        }
      }
    } catch (error) {

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

        return;
      }

      // Crear nuevo registro
      const { error } = await supabase!
        .from('recogidas')
        .insert({
          número: número,
          tramitado: null,
        });

      if (error) {

      } else {

      }
    } catch (error) {

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

        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitado (Hora de Madrid)
      const nowMadrid = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date()).replace(' ', 'T');

      const { error } = await supabase!
        .from('recogidas')
        .update({
          tramitado: nowMadrid,
        })
        .eq('id', recordId);

      if (error) {

      } else {

      }
    } catch (error) {

    }
  }

  /**
   * Actualizar la fecha de tramitación cuando un envío se marca como "Entregado"
   */
  async completeTracking(número: string): Promise<void> {
    if (!this.isEnabled()) return;

    try {
      // Buscar el registro más reciente sin fecha de tramitado en la tabla recogidas
      const { data: records } = await supabase!
        .from('recogidas')
        .select('id')
        .eq('número', número)
        .is('tramitado', null)
        .order('creación', { ascending: false })
        .limit(1);

      if (!records || records.length === 0) {

        return;
      }

      const recordId = records[0].id;

      // Actualizar con la fecha de tramitado (Hora de Madrid)
      const nowMadrid = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date()).replace(' ', 'T');

      const { error } = await supabase!
        .from('recogidas')
        .update({
          tramitado: nowMadrid,
        })
        .eq('id', recordId);

      if (error) {
        console.error('Error updating recogida (entregado):', error);
      } else {
        console.log(`Recogida completada (entregado) para número ${número}`);
      }
    } catch (error) {

    }
  }

  /**
   * Trackear recogida completa (crear registro con ambas fechas o actualizar si existe)
   * @param numero - Número del envío
   * @param fechaCreacion - Fecha de creación (cuando entró en estado de recogida)
   * @param fechaTramitado - Fecha de envío (cuando se marcó como recogida enviada)
   */
  async trackRecogida(número: string, fechaCreacion?: string, fechaTramitado?: string): Promise<void> {

    if (!this.isEnabled()) {

      return;
    }

    try {
      const getLocalTime = (dateStr?: string): string => {
        const date = dateStr ? new Date(dateStr) : new Date();
        return new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Madrid',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date).replace(' ', 'T');
      };

      const tramitadoDate = getLocalTime(fechaTramitado);
      const creacionDate = getLocalTime(fechaCreacion);


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

        } else {

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

        } else {

        }
      }
    } catch (error) {

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

    if (!this.isEnabled()) {

      return;
    }

    try {
      const getLocalTime = (dateStr?: string): string => {
        const date = dateStr ? new Date(dateStr) : new Date();
        return new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Madrid',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(date).replace(' ', 'T');
      };

      const informeDate = getLocalTime(fechaInforme);
      const creacionDate = getLocalTime(fechaCreacion);


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

        } else {

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

        } else {

        }
      }
    } catch (error) {

    }
  }

  /**
   * Obtener estadísticas de tiempo de asesoramientos desde Supabase
   */
  async getAsesoramientoStats(): Promise<{
    dailyData: { date: string; avgHours: number; count: number }[];
  }> {

    if (!this.isEnabled()) {

      return { dailyData: [] };
    }

    try {
      // Obtener todos los registros con duración decimal

      const { data: records, error } = await supabase!
        .from('asesoramientos')
        .select('creación, duracion_decimal')
        .not('duracion_decimal', 'is', null)
        .order('creación', { ascending: true });

      if (error) {

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

      return { weeklyData: [] };
    }

    try {

      // Primera semana completa de 2026: lunes 5 de enero
      const firstMonday2026 = new Date('2026-01-05T00:00:00');
      
      // Obtener todos los registros de la tabla resoluciones_remotas
      const { data: records, error } = await supabase!
        .from('resoluciones_remotas')
        .select('*')
        .gte('creación', firstMonday2026.toISOString())
        .order('creación', { ascending: true });

      if (error) {

        return { weeklyData: [] };
      }


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


      return { weeklyData };
    } catch (error) {

      return { weeklyData: [] };
    }
  }

  /**
   * Abre un ciclo de resolución si no existe uno activo
   * @param numero - Número de expediente
   */
  async openResolutionRecord(numero: string | number): Promise<void> {
    if (!this.isEnabled() || !numero) return;

    const trimmedNumero = String(numero).trim();

    try {
      // 1. Buscamos si ya hay uno abierto (resolución IS NULL)
      const { data, error: selectError } = await supabase!
        .from('resoluciones_remotas')
        .select('id')
        .eq('número', trimmedNumero)
        .is('resolución', null)
        .limit(1)
        .maybeSingle();

      if (selectError) {

        return;
      }

      // 2. Si no hay ninguno abierto, lo creamos
      if (!data) {
        const nowMadrid = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Madrid',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        }).format(new Date()).replace(' ', 'T');
        

        const { error: insertError } = await supabase!
          .from('resoluciones_remotas')
          .insert({ 
            número: trimmedNumero, 
            creación: nowMadrid,
            resolución: null // Forzamos explícitamente a null
          });

        if (insertError) {
          // Si el error es "duplicate key", significa que alguien lo creó justo antes
          if (insertError.code === '23505') {

          } else {

          }
        }
      } else {
        console.log(`[Supabase] Ya existe un ciclo abierto para ${trimmedNumero} (ID: ${data.id})`);
      }
    } catch (error) {

    }
  }

  /**
   * Cierra el ciclo abierto de un expediente
   * @param numero - Número de expediente
   */
  async completeResolutionRecord(numero: string | number): Promise<void> {
    if (!this.isEnabled() || !numero) return;

    try {
      const stringNumero = String(numero).trim();
      const nowMadrid = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date()).replace(' ', 'T');
      

      const { data, error } = await supabase!
        .from('resoluciones_remotas')
        .update({ resolución: nowMadrid })
        .eq('número', stringNumero)
        .is('resolución', null)
        .select();

      if (error) {

      } else if (data && data.length > 0) {

      } else {

      }
    } catch (error) {

    }
  }

  /**
   * Borra el ciclo abierto (para reprogramaciones o salida de "Requiere acción")
   * @param numero - Número de expediente
   */
  async cancelResolutionRecord(numero: string | number): Promise<void> {
    if (!this.isEnabled() || !numero) return;

    try {
      const stringNumero = String(numero).trim();
      console.log(`[Supabase] Cancelando ciclo (borrando record abierto): ${stringNumero}`);
      const { data, error } = await supabase!
        .from('resoluciones_remotas')
        .delete()
        .eq('número', stringNumero)
        .is('resolución', null)
        .select();

      if (error) {

      } else if (data && data.length > 0) {

      } else {

      }
    } catch (error) {

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

        return [];
      }


      return records || [];
    } catch (error) {

      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
