import { useState, useEffect } from 'react';
import { Search, User, ChevronDown, X, FileText, Phone, Check, Eye } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Registro } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ESTADO_OPTIONS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés'
];

// Estados para Gestora Operativa (sin Citado)
const GESTORA_OPERATIVA_ESTADOS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés'
];

// Estados permitidos para filtrar en Gestora Técnica
// Estados permitidos para filtrar y seleccionar en Gestora Técnica
const GESTORA_TECNICA_ESTADOS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
];

export default function Registros() {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingCita, setEditingCita] = useState<string | null>(null);
  const [editCitaValue, setEditCitaValue] = useState('');
  const [savingCita, setSavingCita] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [editingComentarios, setEditingComentarios] = useState<string | null>(null);
  const [editComentariosValue, setEditComentariosValue] = useState('');
  const [savingComentarios, setSavingComentarios] = useState(false);

  const isGestoraTecnica = user?.role === 'Gestora Técnica';
  const isGestoraOperativa = user?.role === 'Gestora Operativa';

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString || '-';
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      const data = await airtableService.getRegistros();
      setRegistros(data);
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async (registroId: string, newStatus: string) => {
    if (savingStatus) return;
    
    setSavingStatus(true);
    try {
      await airtableService.updateRegistro(registroId, { estado: newStatus });
      
      setRegistros(prev => 
        prev.map(registro => 
          registro.id === registroId 
            ? { ...registro, estado: newStatus }
            : registro
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

  const handleSaveCita = async (registroId: string, newCita: string) => {
    if (savingCita) return;
    
    setSavingCita(true);
    try {
      await airtableService.updateRegistro(registroId, { cita: newCita });
      
      setRegistros(prev => 
        prev.map(registro => 
          registro.id === registroId 
            ? { ...registro, cita: newCita }
            : registro
        )
      );
      
      setEditingCita(null);
    } catch (error) {
      console.error('Error updating cita:', error);
      alert('Error al actualizar la cita');
    } finally {
      setSavingCita(false);
    }
  };

  const handleCancelCitaEdit = () => {
    setEditingCita(null);
  };

  const handleSaveComentarios = async (registroId: string, newComentarios: string) => {
    if (savingComentarios) return;
    
    setSavingComentarios(true);
    try {
      await airtableService.updateRegistro(registroId, { comentarios: newComentarios });
      
      setRegistros(prev => 
        prev.map(registro => 
          registro.id === registroId 
            ? { ...registro, comentarios: newComentarios }
            : registro
        )
      );
      
      if (selectedRegistro?.id === registroId) {
        setSelectedRegistro(prev => prev ? { ...prev, comentarios: newComentarios } : null);
      }
      
      setEditingComentarios(null);
    } catch (error) {
      console.error('Error updating comentarios:', error);
      alert('Error al actualizar los comentarios');
    } finally {
      setSavingComentarios(false);
    }
  };

  const handleCancelComentariosEdit = () => {
    setEditingComentarios(null);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case '1ª Llamada':
        return 'bg-green-50 text-green-700';
      case '2ª Llamada':
        return 'bg-green-100 text-green-800';
      case 'Ilocalizable':
        return 'bg-gray-100 text-gray-600';
      case 'No interesado':
        return 'bg-gray-200 text-gray-700';
      case 'Informe':
        return 'bg-green-200 text-green-900';
      case 'Inglés':
        return 'bg-green-300 text-green-950';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRegistros = registros.filter(registro => {
    const matchesSearch = !searchTerm || 
      registro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.telefono?.includes(searchTerm) ||
      registro.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.contrato?.toString().includes(searchTerm);

    // Excluir estados no deseados
    const estadosExcluidos = ['Inglés', 'Informe', 'No interesado', 'Ilocalizable'];
    const isExcluded = registro.estado && estadosExcluidos.includes(registro.estado);

    // Filtrar para Gestora Técnica
    if (isGestoraTecnica) {
      const matchesEstado = !registro.estado || GESTORA_TECNICA_ESTADOS.includes(registro.estado);
      const matchesAsesor = registro.asesor === 'Milagros';
      return matchesSearch && matchesEstado && matchesAsesor && !isExcluded;
    }

  // Filtrar para Gestora Operativa
  if (isGestoraOperativa) {
    const matchesEstado = !registro.estado || GESTORA_OPERATIVA_ESTADOS.includes(registro.estado);
    return matchesSearch && matchesEstado && !isExcluded;
  }    return matchesSearch && !isExcluded;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Asesoramientos</h1>
          <p className="text-gray-600 mt-2">Visualización y gestión de estados de asesoramientos</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, email, dirección o número de contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cita</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <User className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No se encontraron registros</p>
                    <p className="mt-1">Intenta ajustar los criterios de búsqueda</p>
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {registro.contrato || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.telefono || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-48">
                      <div className="max-w-[12rem] truncate" title={registro.direccion}>
                        {registro.direccion || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{editingStatus === registro.id ? (
                        <div className="flex items-center space-x-1">
                          <select
                            value={registro.estado || ''}
                            onChange={(e) => handleSaveStatus(registro.id, e.target.value)}
                            disabled={savingStatus}
                            className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50"
                            autoFocus
                          >
                            <option value="">Seleccionar estado</option>
                            {(isGestoraOperativa
                              ? GESTORA_OPERATIVA_ESTADOS
                              : isGestoraTecnica
                                ? GESTORA_TECNICA_ESTADOS
                                : ESTADO_OPTIONS
                            ).map((status) => (
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
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span 
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(registro.estado)}`}
                          onClick={() => setEditingStatus(registro.id)}
                          title="Click para cambiar estado"
                        >
                          {registro.estado || 'Sin estado'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCita === registro.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="datetime-local"
                            value={editCitaValue}
                            onChange={(e) => setEditCitaValue(e.target.value)}
                            className="text-sm px-2 py-1 border rounded focus:ring-1 focus:ring-brand-primary disabled:opacity-50"
                            disabled={savingCita}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCita(registro.id, editCitaValue)}
                            disabled={savingCita}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50 flex-shrink-0"
                            title="Guardar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelCitaEdit}
                            disabled={savingCita}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 flex-shrink-0"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                          onClick={() => {
                            setEditingCita(registro.id);
                            setEditCitaValue(registro.cita || '');
                          }}
                          title="Click para editar"
                        >
                          {formatDateTime(registro.cita)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón de ver detalles */}
                        <button
                          onClick={() => setSelectedRegistro(registro)}
                          className="inline-flex items-center justify-center p-2 rounded-full text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {/* Botón de formulario */}
                        <button
                          onClick={() => {
                            const asesor = registro.asesor || '';
                            const contrato = registro.contrato || '';
                            const url = `https://ritest.fillout.com/asesoramiento?asesor=${encodeURIComponent(asesor)}&contrato=${encodeURIComponent(contrato)}`;
                            window.open(url, '_blank');
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                          title="Abrir formulario de asesoramiento"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        {/* Botón de llamada */}
                        {registro.telefono && (
                          <a
                            href={`tel:${registro.telefono}`}
                            className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                            title="Llamar al cliente"
                          >
                            <Phone className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalles */}
      {selectedRegistro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Detalles del Registro</h2>
              <button
                onClick={() => setSelectedRegistro(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Contrato</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.contrato || '-'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Nombre</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.nombre || '-'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Teléfono</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.telefono || '-'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Dirección</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.direccion || '-'}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs uppercase text-gray-500">Estado</h3>
                    <button
                      onClick={() => setEditingStatus(selectedRegistro.id)}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingStatus === selectedRegistro.id ? (
                    <div className="space-y-2">
                      <select
                        value={selectedRegistro.estado || ''}
                        onChange={(e) => handleSaveStatus(selectedRegistro.id, e.target.value)}
                        disabled={savingStatus}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        autoFocus
                      >
                        <option value="">Seleccionar estado...</option>
                        {isGestoraTecnica ? (
                          GESTORA_TECNICA_ESTADOS.map((estado) => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))
                        ) : (
                          GESTORA_OPERATIVA_ESTADOS.map((estado) => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveStatus(selectedRegistro.id, selectedRegistro.estado || '')}
                          disabled={savingStatus}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelStatusEdit}
                          disabled={savingStatus}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{selectedRegistro.estado || '-'}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs uppercase text-gray-500">Cita</h3>
                    <button
                      onClick={() => {
                        setEditingCita(selectedRegistro.id);
                        setEditCitaValue(selectedRegistro.cita || '');
                      }}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingCita === selectedRegistro.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editCitaValue}
                        onChange={(e) => setEditCitaValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={savingCita}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveCita(selectedRegistro.id, editCitaValue)}
                          disabled={savingCita}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancelCitaEdit}
                          disabled={savingCita}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedRegistro.cita)}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Email</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.email || '-'}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">Comentarios</h3>
                  <button
                    onClick={() => {
                      setEditingComentarios(selectedRegistro.id);
                      setEditComentariosValue(selectedRegistro.comentarios || '');
                    }}
                    className="text-xs text-brand-primary hover:text-brand-green"
                  >
                    Editar
                  </button>
                </div>
                {editingComentarios === selectedRegistro.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editComentariosValue}
                      onChange={(e) => setEditComentariosValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                      rows={4}
                      disabled={savingComentarios}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveComentarios(selectedRegistro.id, editComentariosValue)}
                        disabled={savingComentarios}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancelComentariosEdit}
                        disabled={savingComentarios}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{selectedRegistro.comentarios || '-'}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Informe</h3>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{selectedRegistro.informe || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
