import React from 'react';
import AdminDashboardView from './AdminDashboardView';
import TechDashboardView from './TechDashboardView';
import LoadingSpinner from '../../common/LoadingSpinner';
import { 
  Trabajador, 
  AdminStats, 
  AsesoramientosStats, 
  TimeStats, 
  AsesoramientosEstadosStats,
  TechStats,
  TechRemoteStats,
  Tech24hStats
} from '../../../hooks/useDashboardStats';

interface ManagerDashboardViewProps {
  trabajadores: Trabajador[];
  selectedTrabajador: Trabajador | null;
  onSelectTrabajador: (trabajador: Trabajador | null) => void;
  loading: boolean;
  // Stats for Admin view
  adminStats: AdminStats | null;
  asesoramientosStats: AsesoramientosStats | null;
  asesoramientoTimeStats: TimeStats | null;
  asesoramientosEstadosStats: AsesoramientosEstadosStats | null;
  recogidaTimeStats: TimeStats | null;
  tramitacionTimeStats: TimeStats | null;
  // Stats for Tech view
  techStats: TechStats | null;
  techRemoteStats: TechRemoteStats | null;
  tech24hStats: Tech24hStats | null;
}

const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({
  trabajadores,
  selectedTrabajador,
  onSelectTrabajador,
  loading,
  adminStats,
  asesoramientosStats,
  asesoramientoTimeStats,
  asesoramientosEstadosStats,
  recogidaTimeStats,
  tramitacionTimeStats,
  techStats,
  techRemoteStats,
  tech24hStats
}) => {
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
            onSelectTrabajador(trabajador || null);
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
        <LoadingSpinner message={`Cargando panel de ${selectedTrabajador.nombre}...`} />
      )}

      {selectedTrabajador && !loading && (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Vista de:</strong> {selectedTrabajador.nombre} ({selectedTrabajador.rol})
            </p>
          </div>

          {selectedTrabajador.rol === 'Técnico' && techStats && (
            <TechDashboardView
              techStats={techStats}
              techRemoteStats={techRemoteStats}
              tech24hStats={tech24hStats}
              isStandalone={false}
            />
          )}

          {selectedTrabajador.rol === 'Administrativa' && adminStats && asesoramientosStats && (
            <AdminDashboardView
              adminStats={adminStats}
              asesoramientosStats={asesoramientosStats}
              asesoramientoTimeStats={asesoramientoTimeStats}
              asesoramientosEstadosStats={asesoramientosEstadosStats}
              recogidaTimeStats={recogidaTimeStats}
              tramitacionTimeStats={tramitacionTimeStats}
              isStandalone={false}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerDashboardView;
