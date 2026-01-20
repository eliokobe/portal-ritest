import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../ui/Button';
import { MOTIVO_TECNICO_OPTIONS } from '../../../utils/constants';

interface MotivoTecnicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (motivo: string) => Promise<void>;
  estado: string;
}

export const MotivoTecnicoModal: React.FC<MotivoTecnicoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  estado,
}) => {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!motivo) {
      alert('Por favor selecciona un motivo técnico');
      return;
    }

    setSaving(true);
    try {
      await onSave(motivo);
      onClose();
    } catch (error) {
      alert('Error al guardar el motivo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acción Técnica Requerida"
      subtitle={`Al cambiar a ${estado}, por favor indica el motivo.`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={!motivo}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs font-medium text-gray-700 uppercase">
          Motivo Técnico
        </label>
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          disabled={saving}
        >
          <option value="">Seleccionar...</option>
          {MOTIVO_TECNICO_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
};
