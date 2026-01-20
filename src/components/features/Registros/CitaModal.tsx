import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { formatCitaInputWithAutoFormat } from '../../../utils/dateUtils';

interface CitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cita: string) => Promise<void>;
  isSaving: boolean;
}

export const CitaModal: React.FC<CitaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [citaInput, setCitaInput] = useState('');

  const handleSave = async () => {
    if (!citaInput || citaInput.length < 16) {
      alert('Por favor completa la fecha y hora en formato DD/MM/YYYY hh:mm');
      return;
    }
    await onSave(citaInput);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Fecha y Hora de Cita"
      size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <input
          type="text"
          placeholder="DD/MM/YYYY hh:mm"
          onChange={(e) => {
            formatCitaInputWithAutoFormat(e);
            setCitaInput(e.target.value);
          }}
          maxLength={16}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          disabled={isSaving}
        />
      </div>
    </Modal>
  );
};
