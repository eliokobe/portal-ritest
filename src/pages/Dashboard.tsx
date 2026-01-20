import React from 'react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AdminDashboardView from '../components/features/Dashboard/AdminDashboardView';
import TechDashboardView from '../components/features/Dashboard/TechDashboardView';
import ManagerDashboardView from '../components/features/Dashboard/ManagerDashboardView';
import GeneralDashboardView from '../components/features/Dashboard/GeneralDashboardView';

const Dashboard: React.FC = () => {
  const {
    stats,
    adminStats,
    techStats,
    techRemoteStats,
    tech24hStats,
    asesoramientosStats,
    asesoramientosEstadosStats,
    tramitacionTimeStats,
    recogidaTimeStats,
    asesoramientoTimeStats,
    loading,
    trabajadores,
    selectedTrabajador,
    setSelectedTrabajador,
    clearStats,
    isAdministrativa,
    isTecnico,
    isResponsable
  } = useDashboardStats();

  if (loading && !isResponsable) {
    return <LoadingSpinner message="Cargando panel gráfico..." />;
  }

  if (!isResponsable && !stats && !adminStats && !techStats && !asesoramientosStats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Error al cargar las estadísticas</p>
      </div>
    );
  }

  // Dashboard para Responsable
  if (isResponsable) {
    return (
      <ManagerDashboardView
        trabajadores={trabajadores}
        selectedTrabajador={selectedTrabajador}
        onSelectTrabajador={(t) => {
          clearStats();
          setSelectedTrabajador(t);
        }}
        loading={loading}
        adminStats={adminStats}
        asesoramientosStats={asesoramientosStats}
        asesoramientoTimeStats={asesoramientoTimeStats}
        asesoramientosEstadosStats={asesoramientosEstadosStats}
        recogidaTimeStats={recogidaTimeStats}
        tramitacionTimeStats={tramitacionTimeStats}
        techStats={techStats}
        techRemoteStats={techRemoteStats}
        tech24hStats={tech24hStats}
      />
    );
  }

  // Dashboard para Administrativa
  if (isAdministrativa && adminStats && asesoramientosStats) {
    return (
      <AdminDashboardView
        adminStats={adminStats}
        asesoramientosStats={asesoramientosStats}
        asesoramientoTimeStats={asesoramientoTimeStats}
        asesoramientosEstadosStats={asesoramientosEstadosStats}
        recogidaTimeStats={recogidaTimeStats}
        tramitacionTimeStats={tramitacionTimeStats}
      />
    );
  }

  // Dashboard para Técnico
  if (isTecnico && techStats) {
    return (
      <TechDashboardView
        techStats={techStats}
        techRemoteStats={techRemoteStats}
        tech24hStats={tech24hStats}
      />
    );
  }

  // Dashboard General (otros roles o fallback)
  if (stats) {
    return <GeneralDashboardView stats={stats} />;
  }

  return (
    <div className="text-center py-12">
      <p className="text-gray-500">No hay estadísticas disponibles para tu rol</p>
    </div>
  );
};

export default Dashboard;
