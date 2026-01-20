import React from 'react';
import StatCard from '../../common/charts/StatCard';
import SimpleBarChart from '../../common/charts/SimpleBarChart';
import PercentageBarChart from '../../common/charts/PercentageBarChart';
import { TechStats, TechRemoteStats, Tech24hStats } from '../../../hooks/useDashboardStats';

interface TechDashboardViewProps {
  techStats: TechStats;
  techRemoteStats: TechRemoteStats | null;
  tech24hStats: Tech24hStats | null;
  isStandalone?: boolean;
}

const TechDashboardView: React.FC<TechDashboardViewProps> = ({
  techStats,
  techRemoteStats,
  tech24hStats,
  isStandalone = true
}) => {
  return (
    <div className="space-y-8">
      {isStandalone && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Servicios asignados e incidencias resueltas</p>
        </div>
      )}

      {/* Tarjetas de resumen para Técnico */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Clientes pendientes" value={techStats.clientesPendientes} />
        <StatCard label="Resueltos hoy" value={techStats.clientesResueltosHoy} />
        <StatCard label="Resolución remota (mes)" value={`${techStats.promedioResolucionRemotaMes}%`} />
        <StatCard label="Velocidad resolución (mes)" value={`${techStats.promedioVelocidadResolucionMes}h`} />
      </div>

      {/* Gráficos para Técnico */}
      {/* Gráficos de resolución remota y 24h (uno al lado del otro) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de porcentaje de resolución remota por semana */}
        {techRemoteStats && techRemoteStats.weeklyData.length > 0 && (
          <PercentageBarChart
            data={techRemoteStats.weeklyData}
            title="Porcentaje de Resolución Remota"
            description="Últimas 8 semanas (servicios finalizados)"
            dataKey="remotePercentage"
            yAxisLabel="Porcentaje (%)"
            tooltipLabel="Resolución remota"
          />
        )}

        {/* Gráfico de porcentaje de casos gestionados en 24h */}
        {tech24hStats && tech24hStats.weeklyData.length > 0 && (
          <PercentageBarChart
            data={tech24hStats.weeklyData}
            title="Casos Gestionados en 24h"
            description="Porcentaje de casos resueltos en menos de 24 horas por semana"
            dataKey="percentage24h"
            yAxisLabel="Porcentaje (%)"
            tooltipLabel="Gestionados en 24h"
          />
        )}
      </div>

      {/* Gráficos de servicios asignados e incidencias resueltas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SimpleBarChart
          data={techStats.assignedByDay}
          title="Servicios Asignados"
          description="Últimas 2 semanas (solo días laborables)"
          yAxisLabel="Servicios"
          tooltipLabel="Asignados"
        />
        <SimpleBarChart
          data={techStats.resolvedByDay}
          title="Incidencias Resueltas"
          description="Últimas 2 semanas (solo días laborables)"
          yAxisLabel="Incidencias"
          tooltipLabel="Resueltas"
        />
      </div>
    </div>
  );
};

export default TechDashboardView;
