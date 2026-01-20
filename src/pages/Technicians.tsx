import React, { useState } from 'react';
import { User, Plus } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Tecnico } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useEntityList } from '../hooks/useEntityList';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { EditableField } from '../components/ui/EditableField';

const TECHNICIAN_STATUS_OPTIONS = [
  'Sin contactar',
  'Contactado',
  'Contratado',
  'De baja'
];

export default function Technicians() {
  const { user } = useAuth();
  const isGestoraOperativa = user?.role === 'Gestora Operativa';

  const {
    data: technicians,
    loading,
    searchTerm,
    setSearchTerm,
    refresh,
    setData
  } = useEntityList<Tecnico>({
    fetchFn: airtableService.getTechnicians,
    searchFields: ['nombre', 'provincia', 'telefono', 'observaciones'],
    filterFn: (technician) => {
      if (isGestoraOperativa) {
        return !!(technician.estado && technician.estado.trim() !== '');
      }
      return true;
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTechnician, setNewTechnician] = useState<Omit<Tecnico, 'id'>>({
    nombre: '',
    provincia: '',
    estado: 'Sin contactar',
    telefono: '',
    observaciones: '',
  });

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()) return;

    setCreating(true);
    try {
      const createdTechnician = await airtableService.createTechnician(newTechnician);
      setData(prev => [...prev, createdTechnician]);
      resetForm();
    } catch (error) {
      alert('Error al crear el técnico. Por favor, intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTechnician({
      nombre: '',
      provincia: '',
      estado: 'Sin contactar',
      telefono: '',
      observaciones: '',
    });
    setShowModal(false);
  };

  const columns: Column<Tecnico>[] = [
    {
      header: 'Nombre',
      accessor: 'nombre',
      className: 'font-medium'
    },
    {
      header: 'Provincia',
      accessor: 'provincia'
    },
    {
      header: 'Estado',
      accessor: (tech) => (
        <EditableField
          value={tech.estado || ''}
          type="select"
          options={TECHNICIAN_STATUS_OPTIONS}
          onSave={async (newValue) => {
            await airtableService.updateTechnicianStatus(tech.id, newValue);
            setData(prev => prev.map(t => t.id === tech.id ? { ...t, estado: newValue as Tecnico['estado'] } : t));
          }}
          renderValue={(val) => (
            <span className="font-medium text-brand-primary">
              {val || 'Sin estado'}
            </span>
          )}
        />
      )
    },
    {
      header: 'Teléfono',
      accessor: 'telefono'
    },
    {
      header: 'Observaciones',
      accessor: (tech) => (
        <EditableField
          value={tech.observaciones || ''}
          type="textarea"
          placeholder="Añadir observación..."
          onSave={async (newValue) => {
            await airtableService.updateTechnicianObservations(tech.id, newValue);
            setData(prev => prev.map(t => t.id === tech.id ? { ...t, observaciones: newValue } : t));
          }}
          className="max-w-xs"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Técnicos</h1>
          <p className="text-gray-600 mt-1">Gestión de técnicos y personal</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Buscar técnicos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir
          </Button>
        </div>
      </div>

      <DataTable
        data={technicians}
        columns={columns}
        isLoading={loading}
        rowIdAccessor="id"
        emptyMessage="No se encontraron técnicos."
      />

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title="Añadir Nuevo Técnico"
      >
            <form onSubmit={handleCreateTechnician} className="space-y-4">
          <Input
            label="Nombre *"
                  required
                  value={newTechnician.nombre}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre del técnico"
                />

          <Input
            label="Provincia *"
                  required
                  value={newTechnician.provincia}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, provincia: e.target.value }))}
                  placeholder="Provincia"
                />

          <div className="w-full">
            <label className="block text-xs uppercase text-gray-500 mb-1">Estado *</label>
                <select
                  required
                  value={newTechnician.estado}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, estado: e.target.value as Tecnico['estado'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
            >
              {TECHNICIAN_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
                </select>
              </div>

          <Input
            label="Teléfono *"
                  type="tel"
                  required
                  value={newTechnician.telefono}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Número de teléfono"
                />

          <Textarea
            label="Observaciones"
                  value={newTechnician.observaciones}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales"
                />

              <div className="flex gap-3 pt-4">
            <Button
                  type="button"
              variant="secondary"
                  onClick={resetForm}
              className="flex-1"
                >
                  Cancelar
            </Button>
            <Button
                  type="submit"
              isLoading={creating}
              disabled={!newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()}
              className="flex-1"
            >
              Crear Técnico
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
