import { useState, useEffect } from 'react';
import { Search, User, X, FileText, Phone, Check, Eye, MessageCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Registro } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getStatusColors } from '../utils/statusColors';

const ESTADO_OPTIONS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
];

// Estados para Gestora Operativa (sin Citado)
const GESTORA_OPERATIVA_ESTADOS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés',
  'Citado'
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

// Opciones para Ipartner
const IPARTNER_OPTIONS = [
  'Citado',
  'Finalizado',
  'Cancelado',
  'Facturado'
];

export default function Registros() {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingCita, setEditingCita] = useState<string | null>(null);
  const [editCitaValue, setEditCitaValue] = useState('');
  const [savingCita, setSavingCita] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<Registro | null>(null);
  const [editingComentarios, setEditingComentarios] = useState<string | null>(null);
  const [editComentariosValue, setEditComentariosValue] = useState('');
  const [savingComentarios, setSavingComentarios] = useState(false);
  const [updatingTramitado, setUpdatingTramitado] = useState<string | null>(null);

  const isGestoraTecnica = user?.role === 'Gestora Técnica';
  const isGestoraOperativa = user?.role === 'Gestora Operativa';

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      // Airtable devuelve ISO UTC, convertimos a hora local Europe/Madrid
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
    } catch {
      return '-';
    }
  };

  // Convierte de ISO UTC a formato datetime-local para el input
  const formatDateTimeForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      // Airtable devuelve ISO UTC, necesitamos convertir a hora local para el input
      const date = new Date(dateString);
      // Obtener componentes en zona horaria local del navegador
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Convierte de formato datetime-local a ISO UTC para enviar a Airtable
  const convertLocalInputToISO = (localDateTime: string): string => {
    if (!localDateTime) return '';
    try {
      // El input datetime-local está en hora local del navegador
      // Creamos un Date que interpretará esto como hora local
      const date = new Date(localDateTime);
      // Convertimos a ISO UTC
      return date.toISOString();
    } catch {
      return localDateTime;
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
      
      // Actualizar también selectedRegistro si está abierto
      if (selectedRegistro && selectedRegistro.id === registroId) {
        setSelectedRegistro({ ...selectedRegistro, estado: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleMarkTramitado = async (registroId: string) => {
    if (updatingTramitado) return;
    setUpdatingTramitado(registroId);
    try {
      await airtableService.updateRegistro(registroId, { tramitado: true });
      setRegistros((prev) => prev.filter((r) => r.id !== registroId));
      if (selectedRegistro && selectedRegistro.id === registroId) {
        setSelectedRegistro(null);
      }
    } catch (err: any) {
      alert(err?.message || 'No se pudo marcar como tramitado');
    } finally {
      setUpdatingTramitado(null);
    }
  };

  const handleSaveCita = async (registroId: string, newCita: string) => {
    if (savingCita) return;
    
    setSavingCita(true);
    try {
      // Convertir el valor del input datetime-local a formato ISO UTC
      const citaISO = convertLocalInputToISO(newCita);
      
      await airtableService.updateRegistro(registroId, { cita: citaISO });
      
      setRegistros(prev => 
        prev.map(registro => 
          registro.id === registroId 
            ? { ...registro, cita: citaISO }
            : registro
        )
      );
      
      // También actualizar el registro seleccionado en el modal si está abierto
      if (selectedRegistro?.id === registroId) {
        setSelectedRegistro(prev => prev ? { ...prev, cita: citaISO } : null);
      }
      
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ipartner</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={registro.estado || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          if (!newValue || newValue === registro.estado) return;
                          setSavingStatus(true);
                          try {
                            await handleSaveStatus(registro.id, newValue);
                          } catch (error) {
                            console.error('Error updating estado:', error);
                            alert('Error al actualizar el estado');
                          } finally {
                            setSavingStatus(false);
                          }
                        }}
                        disabled={savingStatus}
                        className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getStatusColors(registro.estado).bg} ${getStatusColors(registro.estado).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          width: `${(registro.estado || 'Sin estado').length + 4}ch`,
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem'
                        }}
                      >
                        <option value="">Seleccionar...</option>
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
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={registro.ipartner || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          if (!newValue || newValue === registro.ipartner) return;
                          try {
                            await airtableService.updateRegistro(registro.id, { ipartner: newValue });
                            setRegistros(prev => 
                              prev.map(r => 
                                r.id === registro.id 
                                  ? { ...r, ipartner: newValue }
                                  : r
                              )
                            );
                            if (selectedRegistro && selectedRegistro.id === registro.id) {
                              setSelectedRegistro({ ...selectedRegistro, ipartner: newValue });
                            }
                          } catch (error) {
                            console.error('Error updating ipartner:', error);
                            alert('Error al actualizar ipartner');
                          }
                        }}
                        className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getStatusColors(registro.ipartner).bg} ${getStatusColors(registro.ipartner).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          width: `${(registro.ipartner || 'Seleccionar').length + 4}ch`,
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem'
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {IPARTNER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRegistro(registro)}
                        className="text-brand-primary hover:text-brand-primary/80 font-medium"
                      >
                        Ver detalles
                      </button>
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
              <div className="flex items-center gap-2">
                {selectedRegistro.telefono && (
                  <a
                    href={`tel:${selectedRegistro.telefono}`}
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                    title="Llamar"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                )}
                <button
                  onClick={() => {
                    const asesor = selectedRegistro.asesor || '';
                    const contrato = selectedRegistro.contrato || '';
                    const url = `https://ritest.fillout.com/asesoramiento?asesor=${encodeURIComponent(asesor)}&contrato=${encodeURIComponent(contrato)}`;
                    window.open(url, '_blank');
                  }}
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Abrir formulario de asesoramiento"
                >
                  <FileText className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedRegistro(null)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Contrato</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.contrato || '-'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Expediente</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.expediente || '-'}</p>
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
                <div className="flex flex-col">
                  <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                  <div>
                    <select
                      value={selectedRegistro.estado || ''}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        if (!newValue || newValue === selectedRegistro.estado) return;
                        await handleSaveStatus(selectedRegistro.id, newValue);
                      }}
                      disabled={savingStatus}
                      className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 inline-block ${getStatusColors(selectedRegistro.estado).bg} ${getStatusColors(selectedRegistro.estado).text}`}
                      style={{ 
                        appearance: 'none', 
                        backgroundImage: 'none',
                        paddingLeft: '0.75rem',
                        paddingRight: '0.75rem'
                      }}
                    >
                      <option value="">Seleccionar...</option>
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
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs uppercase text-gray-500">Cita</h3>
                    <button
                      onClick={() => {
                        setEditingCita(selectedRegistro.id);
                        setEditCitaValue(formatDateTimeForInput(selectedRegistro.cita));
                      }}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingCita === selectedRegistro.id ? (
                    <div className="space-y-2">
                      <input
                        type="datetime-local"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
