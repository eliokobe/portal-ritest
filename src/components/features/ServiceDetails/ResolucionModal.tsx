import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../ui/Button';
import { RESOLUCION_CANCELADO_OPTIONS, RESOLUCION_FINALIZADO_OPTIONS, RESOLUCION_PRESUPUESTO_OPTIONS } from '../../../utils/constants';

interface ResolucionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (resolucion: string) => Promise<void>;
  estado: string;
}

export const ResolucionModal: React.FC<ResolucionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  estado,
}) => {
  const [resolucion, setResolucion] = useState('');
  const [saving, setSaving] = useState(false);

  const options = estado === 'Cancelado' 
    ? RESOLUCION_CANCELADO_OPTIONS 
    : estado === 'Finalizado' 
    ? RESOLUCION_FINALIZADO_OPTIONS 
    : RESOLUCION_PRESUPUESTO_OPTIONS;

  const handleSave = async () => {
    if (!resolucion) {
      alert('Por favor selecciona una resolución');
      return;
    }

    setSaving(true);
    try {
      await onSave(resolucion);
      onClose();
    } catch (error) {
      alert('Error al guardar la resolución');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resolución de ${estado}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={!resolucion}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs font-medium text-gray-700 uppercase">
          Motivo / Resolución
        </label>
        <select
          value={resolucion}
          onChange={(e) => setResolucion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          disabled={saving}
        >
          <option value="">Seleccionar...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
};
