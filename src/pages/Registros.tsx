import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRegistros } from '../hooks/features/useRegistros';
import { SearchBar } from '../components/common/ui/SearchBar';
import { RegistroTable } from '../components/features/Registros/RegistroTable';
import { RegistroDetails } from '../components/features/Registros/RegistroDetails';
import { CitaModal } from '../components/features/Registros/CitaModal';
import { Registro } from '../types';

const ESTADO_OPTIONS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
];

const GESTORA_OPERATIVA_ESTADOS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
];

const GESTORA_TECNICA_ESTADOS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
];

const IPARTNER_OPTIONS = [
  'Citado',
  'Finalizado',
  'Cancelado',
  'Facturado'
];

interface RegistrosProps {
  initialSelectedRegistroId?: string;
  onClose?: () => void;
}

export default function Registros({ initialSelectedRegistroId, onClose }: RegistrosProps) {
  const { user } = useAuth();
  const {
    registros,
    loading,
    searchTerm,
    setSearchTerm,
    savingStatus,
    savingCita,
    savingComentarios,
    handleUpdateStatus,
    handleUpdateCita,
    handleUpdateComentarios,
    handleUpdateIpartner,
  } = useRegistros({ userRole: user?.role });

  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [pendingEstadoChange, setPendingEstadoChange] = useState<{ registroId: string, newEstado: string } | null>(null);

  // Auto-select registro if initialSelectedRegistroId is provided
  useEffect(() => {
    if (initialSelectedRegistroId && registros.length > 0 && !selectedRegistro) {
      const registro = registros.find(r => r.id === initialSelectedRegistroId);
      if (registro) {
        setSelectedRegistro(registro);
      }
    }
  }, [initialSelectedRegistroId, registros, selectedRegistro]);

  const isGestoraTecnica = user?.role === 'Gestora Técnica';
  const isGestoraOperativa = user?.role === 'Gestora Operativa';

  const statusOptions = isGestoraOperativa
    ? GESTORA_OPERATIVA_ESTADOS
    : isGestoraTecnica
      ? GESTORA_TECNICA_ESTADOS
      : ESTADO_OPTIONS;

  const onUpdateStatus = async (id: string, newStatus: string): Promise<boolean> => {
    if (newStatus === 'Citado') {
      setPendingEstadoChange({ registroId: id, newEstado: newStatus });
      setShowCitaModal(true);
      return false;
    }
    return await handleUpdateStatus(id, newStatus);
  };

  const onSaveCita = async (citaISO: string) => {
    if (pendingEstadoChange) {
      if (await handleUpdateCita(pendingEstadoChange.registroId, citaISO)) {
        await handleUpdateStatus(pendingEstadoChange.registroId, pendingEstadoChange.newEstado);
        setShowCitaModal(false);
        setPendingEstadoChange(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Asesoramientos</h1>
          <p className="text-gray-600 mt-2">Visualización y gestión de estados de asesoramientos</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nombre, teléfono, email, dirección o número de contrato..."
          />
        </div>
      </div>

      <RegistroTable
        registros={registros}
        loading={loading}
        onViewDetails={setSelectedRegistro}
        onUpdateStatus={onUpdateStatus}
        onUpdateIpartner={handleUpdateIpartner}
        statusOptions={statusOptions}
        ipartnerOptions={IPARTNER_OPTIONS}
        savingStatus={savingStatus}
      />

      {selectedRegistro && (
        <RegistroDetails
          registro={selectedRegistro}
          isOpen={!!selectedRegistro}
          onClose={() => {
            setSelectedRegistro(null);
            onClose?.();
          }}
          onUpdateStatus={onUpdateStatus}
          onUpdateIpartner={handleUpdateIpartner}
          onUpdateCita={handleUpdateCita}
          onUpdateComentarios={handleUpdateComentarios}
          savingStatus={savingStatus}
          savingCita={savingCita}
          savingComentarios={savingComentarios}
          statusOptions={statusOptions}
          ipartnerOptions={IPARTNER_OPTIONS}
          userName={user?.name}
        />
      )}

      {showCitaModal && (
        <CitaModal
          isOpen={showCitaModal}
          onClose={() => {
            setShowCitaModal(false);
            setPendingEstadoChange(null);
          }}
          onSave={onSaveCita}
          isSaving={savingCita}
        />
      )}
    </div>
  );
}
