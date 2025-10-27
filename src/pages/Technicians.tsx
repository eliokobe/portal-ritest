import { useState, useEffect } from 'react';
import { Search, User, Plus, X, Edit3, Check, ChevronDown } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Tecnico } from '../types';
import { useAuth } from '../contexts/AuthContext';

const TECHNICIAN_STATUS_OPTIONS = [
  'Sin contactar',
  'Contactado',
  'Contratado',
  'De baja'
];

export default function Technicians() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingObservation, setEditingObservation] = useState<string | null>(null);
  const [editObservationValue, setEditObservationValue] = useState('');
  const [savingObservation, setSavingObservation] = useState(false);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [newTechnician, setNewTechnician] = useState<Omit<Tecnico, 'id'>>({
    nombre: '',
    provincia: '',
    estado: 'Sin contactar',
    telefono: '',
    observaciones: '',
  });

  const isGestoraOperativa = user?.role === 'Gestora Operativa';

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await airtableService.getTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Error fetching technicians:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTechnicians();
  }, []);

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()) return;

    setCreating(true);
    try {
      const createdTechnician = await airtableService.createTechnician(newTechnician);
      setTechnicians(prev => [...prev, createdTechnician]);
      setNewTechnician({
        nombre: '',
        provincia: '',
        estado: 'Sin contactar',
        telefono: '',
        observaciones: '',
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating technician:', error);
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

  // Funciones para editar observaciones
  const handleEditObservation = (technicianId: string, currentObservation: string) => {
    setEditingObservation(technicianId);
    setEditObservationValue(currentObservation || '');
  };

  const handleSaveObservation = async (technicianId: string) => {
    if (savingObservation) return;
    
    setSavingObservation(true);
    try {
      await airtableService.updateTechnicianObservations(technicianId, editObservationValue);
      
      // Actualizar el técnico en el estado local
      setTechnicians(prevTechnicians => 
        prevTechnicians.map(technician => 
          technician.id === technicianId 
            ? { ...technician, observaciones: editObservationValue }
            : technician
        )
      );
      
      setEditingObservation(null);
      setEditObservationValue('');
    } catch (error) {
      console.error('Error updating observation:', error);
      alert('Error al guardar la observación');
    } finally {
      setSavingObservation(false);
    }
  };

  const handleCancelObservationEdit = () => {
    setEditingObservation(null);
    setEditObservationValue('');
  };

  // Funciones para editar estado
  const handleEditStatus = (technicianId: string) => {
    setEditingStatus(technicianId);
  };

  const handleSaveStatus = async (technicianId: string, newStatus: string) => {
    if (savingStatus) return;
    
    setSavingStatus(true);
    try {
      await airtableService.updateTechnicianStatus(technicianId, newStatus);
      
      // Actualizar el técnico en el estado local
      setTechnicians(prevTechnicians => 
        prevTechnicians.map(technician => 
          technician.id === technicianId 
            ? { ...technician, estado: newStatus as Tecnico['estado'] }
            : technician
        )
      );
      
      setEditingStatus(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCancelStatusEdit = () => {
    setEditingStatus(null);
  };

  const filteredTechnicians = technicians.filter(technician => {
    const matchesSearch = !searchTerm || 
      technician.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.provincia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.telefono?.includes(searchTerm) ||
      technician.observaciones?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar para Gestora Operativa - solo mostrar técnicos con estado
    if (isGestoraOperativa) {
      const hasEstado = technician.estado && technician.estado.trim() !== '';
      return matchesSearch && hasEstado;
    }
    
    return matchesSearch;
  });

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'contratado':
        return 'bg-green-100 text-green-800';
      case 'contactado':
        return 'bg-green-200 text-green-900';
      case 'sin contactar':
        return 'bg-green-50 text-green-700';
      case 'de baja':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Técnicos</h1>
          <p className="text-gray-600 mt-2">Gestión de técnicos y personal</p>
        </div>
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, provincia o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>

      {/* Lista de técnicos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provincia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary mr-2"></div>
                        Cargando técnicos...
                      </div>
                    ) : (
                      <div>
                        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium">No se encontraron técnicos</p>
                        <p className="mt-1">Intenta ajustar los criterios de búsqueda</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((technician) => (
                  <tr key={technician.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {technician.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {technician.provincia || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {editingStatus === technician.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={technician.estado || ''}
                            onChange={(e) => handleSaveStatus(technician.id, e.target.value)}
                            disabled={savingStatus}
                            className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50"
                            autoFocus
                          >
                            <option value="">Seleccionar estado</option>
                            {TECHNICIAN_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleCancelStatusEdit}
                            disabled={savingStatus}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span 
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(technician.estado)}`}
                          onClick={() => handleEditStatus(technician.id)}
                          title="Click para cambiar estado"
                        >
                          {technician.estado || 'Sin estado'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {technician.telefono || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {editingObservation === technician.id ? (
                        <div className="flex items-center space-x-2">
                          <textarea
                            value={editObservationValue}
                            onChange={(e) => setEditObservationValue(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-xs resize-none"
                            rows={2}
                            placeholder="Añadir observación..."
                            autoFocus
                          />
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleSaveObservation(technician.id)}
                              disabled={savingObservation}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Guardar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={handleCancelObservationEdit}
                              disabled={savingObservation}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="text-sm text-gray-900 max-w-xs truncate cursor-pointer hover:bg-gray-100 rounded px-2 py-1 flex items-center group"
                          onClick={() => handleEditObservation(technician.id, technician.observaciones || '')}
                          title={technician.observaciones || "Click para añadir observación"}
                        >
                          <span className="flex-1">
                            {technician.observaciones || 'Añadir observación...'}
                          </span>
                          <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear técnico */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Añadir Nuevo Técnico</h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTechnician} className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="nombre"
                  required
                  value={newTechnician.nombre}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Nombre del técnico"
                />
              </div>

              <div>
                <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia *
                </label>
                <input
                  type="text"
                  id="provincia"
                  required
                  value={newTechnician.provincia}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, provincia: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Provincia"
                />
              </div>

              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado *
                </label>
                <select
                  id="estado"
                  required
                  value={newTechnician.estado}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, estado: e.target.value as Tecnico['estado'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="Sin contactar">Sin contactar</option>
                  <option value="Contactado">Contactado</option>
                  <option value="Contratado">Contratado</option>
                  <option value="De baja">De baja</option>
                </select>
              </div>

              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  id="telefono"
                  required
                  value={newTechnician.telefono}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Número de teléfono"
                />
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  rows={3}
                  value={newTechnician.observaciones}
                  onChange={(e) => setNewTechnician(prev => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Observaciones adicionales"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTechnician.nombre?.trim() || !newTechnician.provincia?.trim() || !newTechnician.telefono?.trim()}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
