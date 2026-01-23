import React, { useEffect, useState } from 'react';
import { Modal } from '../../common/Modal';
import { Button } from '../../ui/Button';
import { airtableService } from '../../../services/airtable';

interface PresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (presupuesto: string) => Promise<void>;
}

export const PresupuestoModal: React.FC<PresupuestoModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [presupuesto, setPresupuesto] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPresupuesto('');
    setLoading(true);
    setError(null);
    airtableService.getPresupuestoOptions()
      .then((opts) => {
        setOptions(opts);
        if (opts.length === 0) {
          setError('No hay opciones de presupuesto disponibles');
        }
      })
      .catch(() => {
        setOptions([]);
        setError('No se pudieron cargar las opciones de presupuesto');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSave = async () => {
    if (!presupuesto) {
      alert('Por favor selecciona un presupuesto');
      return;
    }
    setSaving(true);
    try {
      await onSave(presupuesto);
      onClose();
    } catch (err) {
      alert('Error al guardar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Presupuesto enviado"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving} disabled={!presupuesto}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs font-medium text-gray-700 uppercase">
          Presupuesto
        </label>
        <select
          value={presupuesto}
          onChange={(e) => setPresupuesto(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
          disabled={loading || saving}
        >
          <option value="">
            {loading ? 'Cargando...' : 'Seleccionar...'}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </Modal>
  );
};
