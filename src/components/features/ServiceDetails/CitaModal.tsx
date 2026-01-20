import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { formatDateTimeForInput, formatCitaInputWithAutoFormat, parseCitaInput } from '../../../utils/helpers';

interface CitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (isoDate: string) => Promise<void>;
  initialDate?: string;
}

export const CitaModal: React.FC<CitaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
}) => {
  const [inputValue, setInputValue] = useState(formatDateTimeForInput(initialDate));
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCitaInputWithAutoFormat(e.target.value);
    setInputValue(formatted);
  };

  const handleSave = async () => {
    if (!inputValue || inputValue.length < 16) {
      alert('Por favor completa la fecha y hora en formato DD/MM/YYYY hh:mm');
      return;
    }

    const date = parseCitaInput(inputValue);
    if (!date) {
      alert('Fecha y hora inválidas');
      return;
    }

    setSaving(true);
    try {
      await onSave(date.toISOString());
      onClose();
    } catch (error) {
      alert('Error al guardar la cita');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Seleccionar Fecha y Hora de Cita"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Fecha y Hora (DD/MM/YYYY hh:mm)"
          placeholder="DD/MM/YYYY hh:mm"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={16}
          disabled={saving}
        />
        <p className="text-xs text-gray-500 italic">
          Ejemplo: 25/12/2025 10:30
        </p>
      </div>
    </Modal>
  );
};
