import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench, CheckCircle, AlertCircle, CheckSquare, ClipboardList } from 'lucide-react';
import { DashboardStats } from '../types';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<{ unsynchronizedCount: number; synchronizedTodayCount: number } | null>(null);
  const [techStats, setTechStats] = useState<{ assignedByDay: { date: string; count: number }[]; resolvedByDay: { date: string; count: number }[] } | null>(null);
  const [asesoramientosStats, setAsesoramientosStats] = useState<{ totalRegistros: number; informesToday: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isAdministrativa = user?.role === 'Administrativa';
  const isTecnico = user?.role === 'Técnico';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isAdministrativa) {
          const [adminData, asesoData] = await Promise.all([
            airtableService.getAdminDashboardStats(),
            airtableService.getAsesoramientosStats()
          ]);
          setAdminStats(adminData);
          setAsesoramientosStats(asesoData);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tramitados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.synchronizedTodayCount}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registros en Asesoramientos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{asesoramientosStats.totalRegistros}</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Informes realizados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{asesoramientosStats.informesToday}</p>
              </div>
              <div className="bg-green-600 p-3 rounded-lg">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tramitados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.synchronizedTodayCount}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes de tramitar</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.unsynchronizedCount}</p>
              </div>
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tramitados hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{adminStats.synchronizedTodayCount}</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
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
      color: 'bg-green-500',
    },
    {
      title: 'Servicios (7 días)',
      value: stats.services7Days,
      icon: Wrench,
      color: 'bg-green-600',
    },
    {
      title: 'Completados (30 días)',
      value: stats.servicesCompleted30Days,
      icon: CheckCircle,
      color: 'bg-green-400',
    },
    {
      title: 'Completados (7 días)',
      value: stats.servicesCompleted7Days,
      icon: CheckCircle,
      color: 'bg-green-700',
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
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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