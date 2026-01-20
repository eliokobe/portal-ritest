import React, { useEffect, useState, memo, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench, CheckCircle, AlertCircle, CheckSquare } from 'lucide-react';
import { DashboardStats } from '../types';
import { airtableService } from '../services/airtable';
import { supabaseService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// Componente memoizado para tarjetas de estadísticas
const StatCard = memo<{ label: string; value: number }>(({ label, value }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
    <p className="text-sm font-medium text-gray-600">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
  </div>
));
StatCard.displayName = 'StatCard';

// Componente memoizado para gráfico de barras de tiempo
const TimeBarChart = memo<{ 
  data: { date: string; avgHours: number; count: number }[];
  title: string;
  description: string;
  countLabel: string;
}>(({ data, title, description, countLabel }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-8">{description}</p>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <YAxis 
          label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px'
          }}
          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
          })}
          formatter={(value: any, name: string | undefined) => {
            if (name === 'avgHours') return [`${value} horas`, 'Tiempo promedio'];
            if (name === 'count') return [`${value} ${countLabel}`, 'Completados'];
            return [value, name || ''];
          }}
        />
        <Bar 
          dataKey="avgHours" 
          fill="#008606" 
          name="avgHours" 
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
));
TimeBarChart.displayName = 'TimeBarChart';

// Componente memoizado para gráfico de dona (estados)
const EstadosPieChart = memo<{
  data: { name: string; value: number; percentage: number }[];
  title: string;
  description: string;
}>(({ data, title, description }) => {
  const colors = useMemo(() => [
    '#1F4D11', '#2E7016', '#3D931A', '#4DB61F',
    '#5CD923', '#6BFC28', '#008606'
  ], []);
  
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0), 
    [data]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-8">{description}</p>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
        <div className="relative">
          <ResponsiveContainer width={350} height={350}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={3}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }}
                formatter={(value: any, _name: string | undefined, props: any) => [
                  `${value} registros (${props.payload.percentage}%)`,
                  props.payload.name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500 mt-1">Total</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 max-w-md">
          {data.map((estado, index) => (
            <div 
              key={estado.name} 
              className="flex items-center gap-4 p-3 rounded-lg bg-white border border-gray-100"
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-semibold text-gray-900 flex-1">{estado.name}</span>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{estado.value}</div>
                <div className="text-xs text-gray-500">{estado.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
EstadosPieChart.displayName = 'EstadosPieChart';

// Componente memoizado para gráficos de porcentaje (resolución remota, 24h)
const PercentageBarChart = memo<{
  data: { week: string; percentage24h?: number; remotePercentage?: number; totalCases?: number; totalServices?: number }[];
  title: string;
  description: string;
  dataKey: string;
  yAxisLabel: string;
  tooltipLabel: string;
}>(({ data, title, description, dataKey, yAxisLabel, tooltipLabel }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-8">{description}</p>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="week" 
          tickFormatter={(value) => {
            const [year, month, day] = value.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
          }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <YAxis 
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px'
          }}
          labelFormatter={(value) => {
            const [year, month, day] = value.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return `Semana del ${date.toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}`;
          }}
          formatter={(value: any, name: string | undefined, props: any) => {
            const total = props.payload.totalCases || props.payload.totalServices;
            return [`${value}% (${total} casos)`, tooltipLabel];
          }}
        />
        <Bar 
          dataKey={dataKey} 
          fill="#008606" 
          name={dataKey}
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
));
PercentageBarChart.displayName = 'PercentageBarChart';

// Componente memoizado para gráficos simples de barras (asignados, resueltos)
const SimpleBarChart = memo<{
  data: { date: string; count: number }[];
  title: string;
  description: string;
  yAxisLabel: string;
  tooltipLabel: string;
}>(({ data, title, description, yAxisLabel, tooltipLabel }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-8">{description}</p>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <YAxis 
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px'
          }}
          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
          })}
          formatter={(value: any) => [`${value} ${tooltipLabel.toLowerCase()}`, tooltipLabel]}
        />
        <Bar 
          dataKey="count" 
          fill="#008606" 
          name={tooltipLabel}
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
));
SimpleBarChart.displayName = 'SimpleBarChart';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<{ unsynchronizedCount: number; synchronizedTodayCount: number; enviosPendientesCount: number; reparacionesPendientesCount: number } | null>(null);
  const [techStats, setTechStats] = useState<{ 
    assignedByDay: { date: string; count: number }[]; 
    resolvedByDay: { date: string; count: number }[];
    clientesPendientes: number;
    clientesResueltosHoy: number;
    promedioResolucionRemotaMes: number;
    promedioVelocidadResolucionMes: number;
  } | null>(null);
  const [techRemoteStats, setTechRemoteStats] = useState<{ weeklyData: { week: string; remotePercentage: number; totalServices: number }[] } | null>(null);
  const [tech24hStats, setTech24hStats] = useState<{ weeklyData: { week: string; percentage24h: number; totalCases: number }[] } | null>(null);
  const [asesoramientosStats, setAsesoramientosStats] = useState<{ totalRegistros: number; informesToday: number } | null>(null);
  const [asesoramientosEstadosStats, setAsesoramientosEstadosStats] = useState<{ estadosData: { name: string; value: number; percentage: number }[] } | null>(null);
  const [tramitacionTimeStats, setTramitacionTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [recogidaTimeStats, setRecogidaTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [asesoramientoTimeStats, setAsesoramientoTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [trabajadores, setTrabajadores] = useState<{ id: string; nombre: string; email: string; rol: string }[]>([]);
  const [selectedTrabajador, setSelectedTrabajador] = useState<{ id: string; nombre: string; email: string; rol: string } | null>(null);
  
  const isAdministrativa = user?.role === 'Administrativa';
  const isTecnico = user?.role === 'Técnico';
  const isResponsable = user?.role === 'Responsable';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Cargar trabajadores si es Responsable
        if (isResponsable) {
          const workers = await airtableService.getWorkers();
          setTrabajadores(workers);
          // Si no hay trabajador seleccionado, terminar aquí
          if (!selectedTrabajador) {
            setLoading(false);
            return;
          }
        }

        if (isAdministrativa) {
          const [adminData, asesoData, asesoEstadosData, timeData, recogidaData, asesoramientoData] = await Promise.all([
            airtableService.getAdminDashboardStats(),
            airtableService.getAsesoramientosStats(),
            airtableService.getAsesoramientosEstadosStats(),
            airtableService.getTramitacionTimeStats(),
            airtableService.getRecogidaTimeStats(),
            airtableService.getAsesoramientoTimeStats()
          ]);
          setAdminStats(adminData);
          setAsesoramientosStats(asesoData);
          setAsesoramientosEstadosStats(asesoEstadosData);
          setTramitacionTimeStats(timeData);
          setRecogidaTimeStats(recogidaData);
          setAsesoramientoTimeStats(asesoramientoData);
        } else if (isTecnico) {
          const [data, remoteData, data24h] = await Promise.all([
            airtableService.getTechnicianDashboardStats(user?.id, user?.email),
            airtableService.getTechnicianRemoteResolutionByWeek(user?.id, user?.email),
            supabaseService.getCasosGestionados24h()
          ]);
          setTechStats(data);
          setTechRemoteStats(remoteData);
          setTech24hStats(data24h);
        } else if (isResponsable && selectedTrabajador) {
          // Si es Responsable y hay un trabajador seleccionado, cargar sus estadísticas
          if (selectedTrabajador.rol === 'Técnico') {
            const [data, remoteData, data24h] = await Promise.all([
              airtableService.getTechnicianDashboardStats(selectedTrabajador.id, selectedTrabajador.email),
              airtableService.getTechnicianRemoteResolutionByWeek(selectedTrabajador.id, selectedTrabajador.email),
              supabaseService.getCasosGestionados24h()
            ]);
            setTechStats(data);
            setTechRemoteStats(remoteData);
            setTech24hStats(data24h);
          } else if (selectedTrabajador.rol === 'Administrativa') {
            const [adminData, asesoData, asesoEstadosData, timeData, recogidaData, asesoramientoData] = await Promise.all([
              airtableService.getAdminDashboardStats(),
              airtableService.getAsesoramientosStats(),
              airtableService.getAsesoramientosEstadosStats(),
              airtableService.getTramitacionTimeStats(),
              airtableService.getRecogidaTimeStats(),
              airtableService.getAsesoramientoTimeStats()
            ]);
            setAdminStats(adminData);
            setAsesoramientosStats(asesoData);
            setAsesoramientosEstadosStats(asesoEstadosData);
            setTramitacionTimeStats(timeData);
            setRecogidaTimeStats(recogidaData);
            setAsesoramientoTimeStats(asesoramientoData);
          }
        } else if (!isResponsable) {
          const data = await airtableService.getDashboardStats();
          setStats(data);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdministrativa, isTecnico, isResponsable, user?.id, user?.email, selectedTrabajador]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando panel gráfico...</p>
      </div>
    );
  }

  // No mostrar error si es Responsable (mostrará el selector)
  if (!isResponsable && !stats && !adminStats && !techStats && !asesoramientosStats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Error al cargar las estadísticas</p>
      </div>
    );
  }
  
  // Dashboard para Administrativa (con Asesoramientos)
  if (isAdministrativa && adminStats && asesoramientosStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Estado de sincronización y estadísticas de asesoramientos</p>
        </div>

        {/* Tarjetas de resumen para Administrativa */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Pendientes de tramitar" value={adminStats.unsynchronizedCount} />
          <StatCard label="Envíos pendientes" value={adminStats.enviosPendientesCount} />
          <StatCard label="Asesoramientos pendientes" value={asesoramientosStats.totalRegistros} />
          <StatCard label="Reparaciones pendientes" value={adminStats.reparacionesPendientesCount} />
        </div>

        {/* Gráficos de asesoramientos lado a lado */}
        {(asesoramientoTimeStats?.dailyData.length || asesoramientosEstadosStats?.estadosData.length) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de tiempo de asesoramientos */}
            {asesoramientoTimeStats && asesoramientoTimeStats.dailyData.length > 0 && (
              <TimeBarChart 
                data={asesoramientoTimeStats.dailyData}
                title="Tiempo de Asesoramientos"
                description="Promedio de horas desde que se crea el registro hasta que se marca como Informe/Ilocalizable/No interesado (Mes actual)"
                countLabel="registros"
              />
            )}

            {/* Gráfico de distribución de estados de asesoramientos */}
            {asesoramientosEstadosStats && asesoramientosEstadosStats.estadosData.length > 0 && (
              <EstadosPieChart
                data={asesoramientosEstadosStats.estadosData}
                title="Distribución de Estados de Asesoramientos"
                description="Registros del mes actual por estado"
              />
            )}
          </div>
        ) : null}

        {/* Gráficos de tiempo de Recogida y Tramitación lado a lado */}
        {(recogidaTimeStats?.dailyData.length || tramitacionTimeStats?.dailyData.length) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de tiempo de recogida */}
            {recogidaTimeStats && recogidaTimeStats.dailyData.length > 0 && (
              <TimeBarChart
                data={recogidaTimeStats.dailyData}
                title="Tiempo de Recogida"
                description="Promedio de horas desde que se crea la recogida hasta que se envía (Mes actual)"
                countLabel="recogidas"
              />
            )}

            {/* Gráfico de tiempo de tramitación */}
            {tramitacionTimeStats && tramitacionTimeStats.dailyData.length > 0 && (
              <TimeBarChart
                data={tramitacionTimeStats.dailyData}
                title="Tiempo de Tramitación"
                description="Promedio de horas desde que aparece en Tramitaciones hasta que se tramita (Mes actual)"
                countLabel="registros"
              />
            )}
          </div>
        ) : null}
      </div>
    );
  }
  
  // Dashboard para Administrativa (solo tramitaciones)
  if (isAdministrativa && adminStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Estado de sincronización de servicios</p>
        </div>

        {/* Tarjetas de resumen para Administrativa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              <div className="bg-[#1F4D11] p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tramitados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.synchronizedTodayCount}</p>
              </div>
              <div className="bg-[#3D931A] p-3 rounded-lg">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Selector de trabajador para Responsable
  if (isResponsable) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico - Vista de Responsable</h1>
          <p className="text-gray-600 mt-2">Selecciona un trabajador para ver su panel</p>
        </div>

        {/* Selector de trabajador */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Trabajador
          </label>
          <select
            value={selectedTrabajador?.id || ''}
            onChange={(e) => {
              const trabajador = trabajadores.find(t => t.id === e.target.value);
              setSelectedTrabajador(trabajador || null);
              // Limpiar estadísticas anteriores
              setTechStats(null);
              setAdminStats(null);
              setTechRemoteStats(null);
              setTech24hStats(null);
              setAsesoramientosStats(null);
              setAsesoramientosEstadosStats(null);
              setTramitacionTimeStats(null);
              setRecogidaTimeStats(null);
              setAsesoramientoTimeStats(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          >
            <option value="">-- Selecciona un trabajador --</option>
            {trabajadores.map((trabajador) => (
              <option key={trabajador.id} value={trabajador.id}>
                {trabajador.nombre} - {trabajador.rol}
              </option>
            ))}
          </select>
        </div>

        {/* Mostrar dashboard del trabajador seleccionado */}
        {!selectedTrabajador && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
            <p className="text-gray-500">Selecciona un trabajador para ver su panel gráfico</p>
          </div>
        )}

        {selectedTrabajador && loading && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 font-medium">Cargando panel de {selectedTrabajador.nombre}...</p>
          </div>
        )}

        {/* Dashboard de Técnico */}
        {selectedTrabajador?.rol === 'Técnico' && techStats && !loading && (
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Vista de:</strong> {selectedTrabajador.nombre} ({selectedTrabajador.rol})
              </p>
            </div>

            {/* Tarjetas de resumen para Técnico */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Clientes pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.clientesPendientes}</p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Resueltos hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.clientesResueltosHoy}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Resolución remota (mes)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.promedioResolucionRemotaMes}%</p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Velocidad resolución (mes)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.promedioVelocidadResolucionMes}h</p>
              </div>
            </div>

            {/* Gráficos para Técnico */}
            {/* Gráficos de resolución remota y 24h (uno al lado del otro) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de porcentaje de resolución remota por semana */}
              {techRemoteStats && techRemoteStats.weeklyData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Porcentaje de Resolución Remota</h3>
                  <p className="text-sm text-gray-500 mb-8">Últimas 8 semanas (servicios finalizados)</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={techRemoteStats.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="week" 
                        tickFormatter={(value) => {
                          const [year, month, day] = value.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                        }}
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <YAxis 
                        label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 16px'
                        }}
                        labelFormatter={(value) => {
                          const date = new Date(value);
                          return `Semana del ${date.toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}`;
                        }}
                        formatter={(value: any, name: string | undefined, props: any) => {
                          if (name === 'remotePercentage') {
                            return [`${value}% (${props.payload.totalServices} servicios)`, 'Resolución remota'];
                          }
                          return [value, name || ''];
                        }}
                      />
                      <Bar 
                        dataKey="remotePercentage" 
                        fill="#008606" 
                        name="remotePercentage"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Gráfico de porcentaje de casos gestionados en 24h */}
              {tech24hStats && tech24hStats.weeklyData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Casos Gestionados en 24h</h3>
                  <p className="text-sm text-gray-500 mb-8">Porcentaje de casos resueltos en menos de 24 horas por semana</p>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={tech24hStats.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                      <XAxis 
                        dataKey="week" 
                        tickFormatter={(value) => {
                          const [year, month, day] = value.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                        }}
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <YAxis 
                        label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 500 }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px 16px'
                        }}
                        labelFormatter={(value) => {
                          const [year, month, day] = value.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return `Semana del ${date.toLocaleDateString('es-ES', { 
                            day: 'numeric', 
                            month: 'long',
                            year: 'numeric'
                          })}`;
                        }}
                        formatter={(value: any, name: string | undefined, props: any) => {
                          if (name === 'percentage24h') {
                            return [`${value}% (${props.payload.totalCases} casos)`, 'Gestionados en 24h'];
                          }
                          return [value, name || ''];
                        }}
                      />
                      <Bar 
                        dataKey="percentage24h" 
                        fill="#008606" 
                        name="percentage24h"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Gráficos de servicios asignados e incidencias resueltas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de servicios asignados */}
              <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Servicios Asignados</h3>
                <p className="text-sm text-gray-500 mb-8">Últimas 2 semanas (solo días laborables)</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={techStats.assignedByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      stroke="#6b7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <YAxis 
                      label={{ value: 'Servicios', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 16px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                      formatter={(value: any) => [`${value} servicios`, 'Asignados']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#008606" 
                      name="Servicios Asignados"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de incidencias resueltas */}
              <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Incidencias Resueltas</h3>
                <p className="text-sm text-gray-500 mb-8">Últimas 2 semanas (solo días laborables)</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={techStats.resolvedByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      stroke="#6b7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <YAxis 
                      label={{ value: 'Incidencias', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                      stroke="#6b7280"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 16px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                      formatter={(value: any) => [`${value} incidencias`, 'Resueltas']}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#008606" 
                      name="Incidencias Resueltas"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard de Administrativa */}
        {selectedTrabajador?.rol === 'Administrativa' && adminStats && asesoramientosStats && !loading && (
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Vista de:</strong> {selectedTrabajador.nombre} ({selectedTrabajador.rol})
              </p>
            </div>

            {/* Tarjetas de resumen para Administrativa */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Envíos pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.enviosPendientesCount}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Asesoramientos pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{asesoramientosStats.totalRegistros}</p>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                <p className="text-sm font-medium text-gray-600">Reparaciones pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.reparacionesPendientesCount}</p>
              </div>
            </div>

            {/* Gráficos de asesoramientos lado a lado */}
            {(asesoramientoTimeStats?.dailyData.length || asesoramientosEstadosStats?.estadosData.length) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico de tiempo de asesoramientos */}
                {asesoramientoTimeStats && asesoramientoTimeStats.dailyData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Tiempo de Asesoramientos</h3>
                    <p className="text-sm text-gray-500 mb-8">Promedio de horas desde que se crea el registro hasta que se marca como Informe/Ilocalizable/No interesado (Mes actual)</p>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={asesoramientoTimeStats.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <YAxis 
                          label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 16px'
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                          formatter={(value: any, name: string | undefined) => {
                            if (name === 'avgHours') return [`${value} horas`, 'Tiempo promedio'];
                            if (name === 'count') return [`${value} registros`, 'Completados'];
                            return [value, name || ''];
                          }}
                        />
                        <Bar 
                          dataKey="avgHours" 
                          fill="#008606" 
                          name="avgHours" 
                          radius={[8, 8, 0, 0]}
                          maxBarSize={60}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Gráfico de distribución de estados de asesoramientos */}
                {asesoramientosEstadosStats && asesoramientosEstadosStats.estadosData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Distribución de Estados de Asesoramientos</h3>
                    <p className="text-sm text-gray-500 mb-8">Registros del mes actual por estado</p>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
                      <div className="relative">
                        <ResponsiveContainer width={350} height={350}>
                          <PieChart>
                            <Pie
                              data={asesoramientosEstadosStats.estadosData}
                              cx="50%"
                              cy="50%"
                              innerRadius={85}
                              outerRadius={130}
                              fill="#8884d8"
                              dataKey="value"
                              paddingAngle={3}
                              stroke="#fff"
                              strokeWidth={3}
                            >
                              {asesoramientosEstadosStats.estadosData.map((_, index) => {
                                const colors = [
                                  '#1F4D11', '#2E7016', '#3D931A', '#4DB61F',
                                  '#5CD923', '#6BFC28', '#008606',
                                ];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 16px'
                              }}
                              formatter={(value: any, _name: string | undefined, props: any) => [
                                `${value} registros (${props.payload.percentage}%)`,
                                props.payload.name
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-900">
                              {asesoramientosEstadosStats.estadosData.reduce((sum, item) => sum + item.value, 0)}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">Total</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 max-w-md">
                        {asesoramientosEstadosStats.estadosData.map((estado, index) => {
                          const colors = [
                            '#1F4D11', '#2E7016', '#3D931A', '#4DB61F',
                            '#5CD923', '#6BFC28', '#008606'
                          ];
                          return (
                            <div 
                              key={estado.name} 
                              className="flex items-center gap-4 p-3 rounded-lg bg-white border border-gray-100"
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: colors[index % colors.length] }}
                              />
                              <span className="text-sm font-semibold text-gray-900 flex-1">{estado.name}</span>
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900">{estado.value}</div>
                                <div className="text-xs text-gray-500">{estado.percentage}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Gráficos de tiempo de Recogida y Tramitación */}
            {(recogidaTimeStats?.dailyData.length || tramitacionTimeStats?.dailyData.length) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico de tiempo de recogida */}
                {recogidaTimeStats && recogidaTimeStats.dailyData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Tiempo de Recogida</h3>
                    <p className="text-sm text-gray-500 mb-8">Promedio de horas desde que se crea la recogida hasta que se envía (Mes actual)</p>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={recogidaTimeStats.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <YAxis 
                          label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 16px'
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                          formatter={(value: any, name: string | undefined) => {
                            if (name === 'avgHours') return [`${value} horas`, 'Tiempo promedio'];
                            if (name === 'count') return [`${value} recogidas`, 'Completadas'];
                            return [value, name || ''];
                          }}
                        />
                        <Bar 
                          dataKey="avgHours" 
                          fill="#008606" 
                          name="avgHours" 
                          radius={[8, 8, 0, 0]}
                          maxBarSize={60}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Gráfico de tiempo de tramitación */}
                {tramitacionTimeStats && tramitacionTimeStats.dailyData.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Tiempo de Tramitación</h3>
                    <p className="text-sm text-gray-500 mb-8">Promedio de horas desde que aparece en Tramitaciones hasta que se tramita (Mes actual)</p>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={tramitacionTimeStats.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <YAxis 
                          label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                          stroke="#6b7280"
                          style={{ fontSize: '12px', fontWeight: 500 }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 16px'
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                          formatter={(value: any, name: string | undefined) => {
                            if (name === 'avgHours') return [`${value} horas`, 'Tiempo promedio'];
                            if (name === 'count') return [`${value} tramitaciones`, 'Completadas'];
                            return [value, name || ''];
                          }}
                        />
                        <Bar 
                          dataKey="avgHours" 
                          fill="#008606" 
                          name="avgHours" 
                          radius={[8, 8, 0, 0]}
                          maxBarSize={60}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  }
  
  if (isTecnico && techStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Servicios asignados e incidencias resueltas</p>
        </div>

        {/* Tarjetas de resumen para Técnico */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-sm font-medium text-gray-600">Clientes pendientes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.clientesPendientes}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-sm font-medium text-gray-600">Resueltos hoy</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.clientesResueltosHoy}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-sm font-medium text-gray-600">Resolución remota (mes)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.promedioResolucionRemotaMes}%</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-sm font-medium text-gray-600">Velocidad resolución (mes)</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{techStats.promedioVelocidadResolucionMes}h</p>
          </div>
        </div>

        {/* Gráficos para Técnico */}
        {/* Gráficos de resolución remota y 24h (uno al lado del otro) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de porcentaje de resolución remota por semana */}
          {techRemoteStats && techRemoteStats.weeklyData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Porcentaje de Resolución Remota</h3>
              <p className="text-sm text-gray-500 mb-8">Últimas 8 semanas (servicios finalizados)</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={techRemoteStats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(value) => {
                      // Usar split para evitar problemas de zona horaria
                      const [year, month, day] = value.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <YAxis 
                    label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 16px'
                    }}
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return `Semana del ${date.toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}`;
                    }}
                    formatter={(value: any, name: string | undefined, props: any) => {
                      if (name === 'remotePercentage') {
                        return [`${value}% (${props.payload.totalServices} servicios)`, 'Resolución remota'];
                      }
                      return [value, name || ''];
                    }}
                  />
                  <Bar 
                    dataKey="remotePercentage" 
                    fill="#008606" 
                    name="remotePercentage"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de porcentaje de casos gestionados en 24h */}
          {tech24hStats && tech24hStats.weeklyData.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Casos Gestionados en 24h</h3>
              <p className="text-sm text-gray-500 mb-8">Porcentaje de casos resueltos en menos de 24 horas por semana</p>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={tech24hStats.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="week" 
                    tickFormatter={(value) => {
                      const [year, month, day] = value.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <YAxis 
                    label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 16px'
                    }}
                    labelFormatter={(value) => {
                      const [year, month, day] = value.split('-');
                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return `Semana del ${date.toLocaleDateString('es-ES', { 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}`;
                    }}
                    formatter={(value: any, name: string | undefined, props: any) => {
                      if (name === 'percentage24h') {
                        return [`${value}% (${props.payload.totalCases} casos)`, 'Gestionados en 24h'];
                      }
                      return [value, name || ''];
                    }}
                  />
                  <Bar 
                    dataKey="percentage24h" 
                    fill="#008606" 
                    name="percentage24h"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráficos de servicios asignados e incidencias resueltas (debajo) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de servicios asignados */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Servicios Asignados</h3>
            <p className="text-sm text-gray-500 mb-8">Últimas 2 semanas (solo días laborables)</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={techStats.assignedByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <YAxis 
                  label={{ value: 'Servicios', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 16px'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                  formatter={(value: any) => [`${value} servicios`, 'Asignados']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#008606" 
                  name="Servicios Asignados"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de incidencias resueltas */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Incidencias Resueltas</h3>
            <p className="text-sm text-gray-500 mb-8">Últimas 2 semanas (solo días laborables)</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={techStats.resolvedByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <YAxis 
                  label={{ value: 'Incidencias', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 16px'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })}
                  formatter={(value: any) => [`${value} incidencias`, 'Resueltas']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#008606" 
                  name="Incidencias Resueltas"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }
  
  // Dashboard para Administrativa
  if (isAdministrativa && adminStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Estado de sincronización de servicios</p>
        </div>

        {/* Tarjetas de resumen para Administrativa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              <div className="bg-[#1F4D11] p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tramitados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.synchronizedTodayCount}</p>
              </div>
              <div className="bg-[#3D931A] p-3 rounded-lg">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Error al cargar las estadísticas</p>
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Servicios (30 días)',
      value: stats.services30Days,
      icon: Wrench,
      color: 'bg-[#3D931A]',
    },
    {
      title: 'Servicios (7 días)',
      value: stats.services7Days,
      icon: Wrench,
      color: 'bg-[#008606]',
    },
    {
      title: 'Completados (30 días)',
      value: stats.servicesCompleted30Days,
      icon: CheckCircle,
      color: 'bg-[#4DB61F]',
    },
    {
      title: 'Completados (7 días)',
      value: stats.servicesCompleted7Days,
      icon: CheckCircle,
      color: 'bg-[#2E7016]',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
        <p className="text-gray-600 mt-2">Resumen de actividad de servicios de punto de recarga</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de barras */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Actividad Semanal (Barras)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { weekday: 'short' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              />
              <Bar dataKey="services" fill="#008606" name="Servicios" />
              <Bar dataKey="completed" fill="#22c55e" name="Completados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de líneas */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Tendencia Semanal (Líneas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { weekday: 'short' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              />
              <Line 
                type="monotone" 
                dataKey="services" 
                stroke="#008606" 
                strokeWidth={3}
                name="Servicios"
                dot={{ fill: '#008606', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#22c55e" 
                strokeWidth={3}
                name="Completados"
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;