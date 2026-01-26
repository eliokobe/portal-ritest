import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEnvios } from '../hooks/features/useEnvios';
import { EnvioTable } from '../components/features/Envios/EnvioTable';
import { EnvioDetailsModal } from '../components/features/Envios/EnvioDetailsModal';
import { CreateEnvioModal } from '../components/features/Envios/CreateEnvioModal';
import { Envio } from '../types';

export default function Envios() {
  const { user } = useAuth();
  const {
    envios,
    loading,
    searchTerm,
    setSearchTerm,
    catalogos,
    serviciosInfo,
    updateEnvio,
    createEnvio
  } = useEnvios({ userClinic: user?.clinic, userRole: user?.role });

  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando envíos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Envíos</h1>
          <p className="text-gray-600 mt-2">Consulta el estado de los envíos de material</p>
        </div>
        <div className="flex items-center gap-4 flex-1 max-w-2xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, seguimiento o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>

      {/* Tabla de envíos */}
      <EnvioTable
        envios={envios}
        loading={loading}
        onViewDetails={setSelectedEnvio}
        onUpdateStatus={async (id, val) => { await updateEnvio(id, { estado: val }); }}
        onUpdateSeguimiento={async (id, val) => { await updateEnvio(id, { seguimiento: val }); }}
        onUpdateFechaEnvio={async (id, val) => { await updateEnvio(id, { fechaEnvio: val }); }}
        servicios={serviciosInfo}
      />

      {/* Modales */}
      <EnvioDetailsModal
        envio={selectedEnvio}
        isOpen={!!selectedEnvio}
        onClose={() => setSelectedEnvio(null)}
        onUpdate={updateEnvio}
        catalogos={catalogos}
        serviciosInfo={serviciosInfo}
        user={user}
      />

      <CreateEnvioModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createEnvio}
        catalogos={catalogos}
        serviciosInfo={serviciosInfo}
      />
    </div>
  );
}
