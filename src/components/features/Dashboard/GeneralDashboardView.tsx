import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wrench, CheckCircle } from 'lucide-react';
import StatCard from '../../common/charts/StatCard';
import { DashboardStats } from '../../../types';

interface GeneralDashboardViewProps {
  stats: DashboardStats;
}

const GeneralDashboardView: React.FC<GeneralDashboardViewProps> = ({ stats }) => {
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
        {summaryCards.map((card, index) => (
          <StatCard
            key={index}
            label={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
          />
        ))}
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

export default GeneralDashboardView;
