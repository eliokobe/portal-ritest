import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wrench, CheckCircle, AlertCircle, CheckSquare, ClipboardList } from 'lucide-react';
import { DashboardStats } from '../types';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<{ unsynchronizedCount: number; synchronizedTodayCount: number; enviosPendientesCount: number; reparacionesPendientesCount: number } | null>(null);
  const [techStats, setTechStats] = useState<{ assignedByDay: { date: string; count: number }[]; resolvedByDay: { date: string; count: number }[] } | null>(null);
  const [asesoramientosStats, setAsesoramientosStats] = useState<{ totalRegistros: number; informesToday: number } | null>(null);
  const [asesoramientosEstadosStats, setAsesoramientosEstadosStats] = useState<{ estadosData: { name: string; value: number; percentage: number }[] } | null>(null);
  const [tramitacionTimeStats, setTramitacionTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [recogidaTimeStats, setRecogidaTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [asesoramientoTimeStats, setAsesoramientoTimeStats] = useState<{ dailyData: { date: string; avgHours: number; count: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isAdministrativa = user?.role === 'Administrativa';
  const isTecnico = user?.role === 'Técnico';

  useEffect(() => {
    const fetchStats = async () => {
      try {
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
          const data = await airtableService.getTechnicianDashboardStats(user?.id, user?.email);
          setTechStats(data);
        } else {
          const data = await airtableService.getDashboardStats();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdministrativa, isTecnico, user?.id, user?.email]);

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

  if (!stats && !adminStats && !techStats && !asesoramientosStats) {
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
          <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-xl font-bold text-gray-900 mb-2">Pendientes de tramitar</p>
            <p className="text-4xl font-bold text-gray-900">{adminStats.unsynchronizedCount}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-xl font-bold text-gray-900 mb-2">Envíos pendientes</p>
            <p className="text-4xl font-bold text-gray-900">{adminStats.enviosPendientesCount}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-xl font-bold text-gray-900 mb-2">Asesoramientos pendientes</p>
            <p className="text-4xl font-bold text-gray-900">{asesoramientosStats.totalRegistros}</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-100 p-6 hover:border-gray-200 transition-colors">
            <p className="text-xl font-bold text-gray-900 mb-2">Reparaciones pendientes</p>
            <p className="text-4xl font-bold text-gray-900">{adminStats.reparacionesPendientesCount}</p>
          </div>
        </div>

        {/* Gráficos de asesoramientos lado a lado */}
        {(asesoramientoTimeStats?.dailyData.length || asesoramientosEstadosStats?.estadosData.length) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de tiempo de asesoramientos */}
            {asesoramientoTimeStats && asesoramientoTimeStats.dailyData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:border-gray-200 transition-colors">
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
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:border-gray-200 transition-colors">
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
                      {asesoramientosEstadosStats.estadosData.map((entry, index) => {
                        const colors = [
                          '#1F4D11', // Verde oscuro
                          '#2E7016', // Verde medio oscuro
                          '#3D931A', // Verde medio
                          '#4DB61F', // Verde medio claro
                          '#5CD923', // Verde claro medio
                          '#6BFC28', // Verde claro
                          '#008606', // Verde claro brillante
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
                      formatter={(value: any, name: string | undefined, props: any) => [
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
                      className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100"
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

        {/* Gráficos de tiempo de Recogida y Tramitación lado a lado */}
        {(recogidaTimeStats?.dailyData.length || tramitacionTimeStats?.dailyData.length) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de tiempo de recogida */}
            {recogidaTimeStats && recogidaTimeStats.dailyData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:border-gray-200 transition-colors">
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
                        if (name === 'count') return [`${value} recogidas`, 'Enviadas'];
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
              <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:border-gray-200 transition-colors">
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
                        if (name === 'count') return [`${value} registros`, 'Tramitados'];
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
          <div className="bg-white rounded-xl border border-gray-100 p-6">
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
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
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
  if (isTecnico && techStats) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Servicios asignados e incidencias resueltas</p>
        </div>

        {/* Gráficos para Técnico */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de servicios asignados */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Servicios Asignados (Últimas 2 Semanas)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={techStats.assignedByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                />
                <Bar dataKey="count" fill="#008606" name="Servicios Asignados" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de incidencias resueltas */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Incidencias Resueltas (Últimas 2 Semanas)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={techStats.resolvedByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
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
                  dataKey="count" 
                  stroke="#22c55e" 
                  strokeWidth={3}
                  name="Incidencias Resueltas"
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
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
          <div className="bg-white rounded-xl border border-gray-100 p-6">
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
          
          <div className="bg-white rounded-xl border border-gray-100 p-6">
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
            <div key={index} className="bg-white rounded-xl border border-gray-100 p-6">
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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
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