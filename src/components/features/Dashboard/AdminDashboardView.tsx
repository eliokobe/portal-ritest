import React from 'react';
import { AlertCircle, CheckSquare } from 'lucide-react';
import StatCard from '../../common/charts/StatCard';
import TimeBarChart from '../../common/charts/TimeBarChart';
import EstadosPieChart from '../../common/charts/EstadosPieChart';
import { AdminStats, AsesoramientosStats, AsesoramientosEstadosStats, TimeStats } from '../../../hooks/useDashboardStats';

interface AdminDashboardViewProps {
  adminStats: AdminStats;
  asesoramientosStats: AsesoramientosStats;
  asesoramientoTimeStats: TimeStats | null;
  asesoramientosEstadosStats: AsesoramientosEstadosStats | null;
  recogidaTimeStats: TimeStats | null;
  tramitacionTimeStats: TimeStats | null;
  isStandalone?: boolean;
}

const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  adminStats,
  asesoramientosStats,
  asesoramientoTimeStats,
  asesoramientosEstadosStats,
  recogidaTimeStats,
  tramitacionTimeStats,
  isStandalone = true
}) => {
  return (
    <div className="space-y-8">
      {isStandalone && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel Gráfico</h1>
          <p className="text-gray-600 mt-2">Estado de sincronización y estadísticas de asesoramientos</p>
        </div>
      )}

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
};

export default AdminDashboardView;
