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
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [pendingEstadoChange, setPendingEstadoChange] = useState<{registroId: string, newEstado: string} | null>(null);

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

  // Formatea entrada DD/MM/YYYY hh:mm a ISO para airtable
  const formatCitaInputWithAutoFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números
    let input = e.target.value.replace(/\D/g, '');
    
    // Auto-formatear a DD/MM/YYYY hh:mm
    if (input.length > 0) {
      // DD
      if (input.length <= 2) {
        e.target.value = input;
      }
      // DD/MM
      else if (input.length <= 4) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2);
      }
      // DD/MM/YYYY
      else if (input.length <= 8) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4);
      }
      // DD/MM/YYYY hh
      else if (input.length <= 10) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8);
      }
      // DD/MM/YYYY hh:mm
      else {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8, 10) + ':' + input.slice(10, 12);
      }
    } else {
      e.target.value = '';
    }
  };

  // Parsea DD/MM/YYYY hh:mm a Date
  const parseCitaInput = (input: string): Date | null => {
    const regex = /(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/;
    const match = input.match(regex);
    
    if (!match) return null;
    
    const [, day, month, year, hours, minutes] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const hoursNum = parseInt(hours);
    const minutesNum = parseInt(minutes);

    // Validar rangos básicos
    if (monthNum < 1 || monthNum > 12) return null;
    if (dayNum < 1 || dayNum > 31) return null;
    if (hoursNum < 0 || hoursNum > 23) return null;
    if (minutesNum < 0 || minutesNum > 59) return null;

    const date = new Date(yearNum, monthNum - 1, dayNum, hoursNum, minutesNum);
    
    // Verificar que la fecha creada corresponde a los valores ingresados
    if (isNaN(date.getTime()) || 
        date.getDate() !== dayNum || 
        date.getMonth() !== monthNum - 1 || 
        date.getFullYear() !== yearNum ||
        date.getHours() !== hoursNum ||
        date.getMinutes() !== minutesNum) {
      return null;
    }
    
    return date;
  };

  // Formatea Date a DD/MM/YYYY hh:mm
  const formatDateTimeForInput = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  // Ajustar altura del textarea de comentarios cuando se abre el modal o cambia el registro
  useEffect(() => {
    if (selectedRegistro) {
      // Usar setTimeout para asegurar que el DOM esté actualizado
      const timer = setTimeout(() => {
        const textarea = document.querySelector('textarea[data-autosize="true"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedRegistro]);

  const fetchRegistros = async () => {
    try {
      const data = await airtableService.getRegistros();
      setRegistros(data);
    } catch (error) {
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
      // Parsear el formato DD/MM/YYYY hh:mm y convertir a ISO
      const date = parseCitaInput(newCita);
      if (!date) {
        alert('Fecha y hora inválidas');
        setSavingCita(false);
        return;
      }
      
      const citaISO = date.toISOString();
      
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

    // Excluir registros con ciertos valores de Ipartner
    const ipartnerExcluidos = ['No interesado', 'Ilocalizable', 'Facturado', 'Cancelado'];
    const isIpartnerExcluded = registro.ipartner && ipartnerExcluidos.includes(registro.ipartner);

    // Si está Citado, debe tener PDF relleno
    const isCitadoWithoutPdf = registro.estado === 'Citado' && (!registro.pdf || registro.pdf.length === 0);

    // Excluir si: Estado=Informe y PDF vacío
    const isInformeWithoutPdf = registro.estado === 'Informe' && (!registro.pdf || registro.pdf.length === 0);

    // Excluir si: Estado=Informe, Ipartner=Citado, Fecha Ipartner hace menos de una semana, y PDF vacío
    const isInformeWithRecentCitedIpartnerAndNoPdf = 
      registro.estado === 'Informe' && 
      registro.ipartner === 'Citado' && 
      (!registro.pdf || registro.pdf.length === 0) &&
      registro.fechaIpartner &&
      (() => {
        const fechaIpartner = new Date(registro.fechaIpartner);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return fechaIpartner > sevenDaysAgo;
      })();

    return matchesSearch && !isIpartnerExcluded && !isCitadoWithoutPdf && !isInformeWithoutPdf && !isInformeWithRecentCitedIpartnerAndNoPdf;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando asesoramientos...</p>
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
      <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 overflow-hidden">
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
                    <td className="px-4 py-3 text-sm text-gray-900 w-48">
                      <div className="max-w-[12rem] truncate" title={registro.nombre}>
                        {registro.nombre || '-'}
                      </div>
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
                          
                          // Si el nuevo estado es Citado, mostrar modal para seleccionar cita
                          if (newValue === 'Citado') {
                            setShowCitaModal(true);
                            setPendingEstadoChange({ registroId: registro.id, newEstado: newValue });
                          } else {
                            setSavingStatus(true);
                            try {
                              await handleSaveStatus(registro.id, newValue);
                            } catch (error) {
                              alert('Error al actualizar el estado');
                            } finally {
                              setSavingStatus(false);
                            }
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
          <div className="bg-white rounded-lg border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-shadow hover:shadow-md">
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
                <div>
                  <h3 className="text-xs uppercase text-gray-500">Email</h3>
                  <p className="text-sm text-gray-900 mt-1">{selectedRegistro.email || '-'}</p>
                </div>
                <div className="flex flex-col">
                  <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                  <div>
                    <select
                      value={selectedRegistro.estado || ''}
                      onChange={async (e) => {
                        const newValue = e.target.value;
                        if (!newValue || newValue === selectedRegistro.estado) return;
                        
                        // Si el nuevo estado es Citado, mostrar modal para seleccionar cita
                        if (newValue === 'Citado') {
                          setShowCitaModal(true);
                          setPendingEstadoChange({ registroId: selectedRegistro.id, newEstado: newValue });
                        } else {
                          await handleSaveStatus(selectedRegistro.id, newValue);
                        }
                      }}
                      disabled={savingStatus}
                      className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 inline-block text-center ${getStatusColors(selectedRegistro.estado).bg} ${getStatusColors(selectedRegistro.estado).text}`}
                      style={{ 
                        appearance: 'none', 
                        backgroundImage: 'none',
                        paddingLeft: '0.5rem',
                        paddingRight: '0.5rem',
                        minWidth: '120px'
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
                  <h3 className="text-xs uppercase text-gray-500 mb-1">Ipartner</h3>
                  <select
                    value={selectedRegistro.ipartner || ''}
                    onChange={async (e) => {
                      const newValue = e.target.value;
                      if (!newValue || newValue === selectedRegistro.ipartner) return;
                      try {
                        await airtableService.updateRegistro(selectedRegistro.id, { ipartner: newValue });
                        setRegistros(prev => 
                          prev.map(r => 
                            r.id === selectedRegistro.id 
                              ? { ...r, ipartner: newValue }
                              : r
                          )
                        );
                        setSelectedRegistro({ ...selectedRegistro, ipartner: newValue });
                      } catch (error) {
                        alert('Error al actualizar ipartner');
                      }
                    }}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getStatusColors(selectedRegistro.ipartner).bg} ${getStatusColors(selectedRegistro.ipartner).text}`}
                    style={{ 
                      appearance: 'none', 
                      backgroundImage: 'none',
                      paddingLeft: '0.5rem',
                      paddingRight: '0.5rem',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {IPARTNER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase text-gray-500 mb-2">PDF</h3>
                {selectedRegistro.pdf && selectedRegistro.pdf.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRegistro.pdf.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        download={file.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-blue-600 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="truncate flex-1">{file.filename}</span>
                        <span className="text-xs text-gray-500">({(file.size || 0) > 1024 ? ((file.size || 0) / 1024).toFixed(1) + ' KB' : (file.size || 0) + ' B'})</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin PDF adjunto</p>
                )}
              </div>
              <div>
                <h3 className="text-xs uppercase text-gray-500 mb-1">Cita</h3>
                {editingCita === selectedRegistro.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      id="citaInputEdit"
                      placeholder="DD/MM/YYYY hh:mm"
                      onChange={formatCitaInputWithAutoFormat}
                      defaultValue={formatDateTimeForInput(selectedRegistro.cita)}
                      maxLength={16}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                      disabled={savingCita}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const input = document.getElementById('citaInputEdit') as HTMLInputElement;
                          const value = input?.value || '';
                          if (value.length < 16) {
                            alert('Por favor completa la fecha y hora en formato DD/MM/YYYY hh:mm');
                            return;
                          }
                          handleSaveCita(selectedRegistro.id, value);
                        }}
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
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">Comentarios</h3>
                </div>
                {selectedRegistro.comentarios && (
                  <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-line">{selectedRegistro.comentarios}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <textarea
                    id={`new-comment-registro-${selectedRegistro.id}`}
                    placeholder="Escribe un nuevo comentario..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
                    rows={3}
                    disabled={savingComentarios}
                  />
                  <button
                    onClick={async () => {
                      const textarea = document.getElementById(`new-comment-registro-${selectedRegistro.id}`) as HTMLTextAreaElement;
                      const newComment = textarea?.value?.trim();
                      
                      if (!newComment) {
                        alert('Por favor escribe un comentario');
                        return;
                      }

                      setSavingComentarios(true);
                      try {
                        const now = new Date();
                        const day = String(now.getDate()).padStart(2, '0');
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const year = now.getFullYear();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                        
                        const userName = user?.name || 'Usuario';
                        const formattedComment = `${formattedDate} - ${userName}: ${newComment}`;
                        
                        const updatedComments = selectedRegistro.comentarios 
                          ? `${formattedComment}\n\n${selectedRegistro.comentarios}`
                          : formattedComment;
                        
                        await airtableService.updateRegistro(selectedRegistro.id, { comentarios: updatedComments });
                        
                        setRegistros(prev => 
                          prev.map(registro => 
                            registro.id === selectedRegistro.id 
                              ? { ...registro, comentarios: updatedComments }
                              : registro
                          )
                        );
                        
                        setSelectedRegistro(prev => prev ? { ...prev, comentarios: updatedComments } : null);
                        
                        textarea.value = '';
                      } catch (error) {
                        alert('Error al guardar el comentario');
                      } finally {
                        setSavingComentarios(false);
                      }
                    }}
                    disabled={savingComentarios}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {savingComentarios ? 'Guardando...' : 'Agregar Comentario'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar Cita */}
      {showCitaModal && pendingEstadoChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowCitaModal(false);
            setPendingEstadoChange(null);
          }}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowCitaModal(false);
                setPendingEstadoChange(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Fecha y Hora de Cita</h2>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  id="citaInputModal"
                  placeholder="DD/MM/YYYY hh:mm"
                  onChange={formatCitaInputWithAutoFormat}
                  maxLength={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                  disabled={savingCita}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const citaInput = document.getElementById('citaInputModal') as HTMLInputElement;
                    const inputValue = citaInput?.value;
                    
                    if (!inputValue || inputValue.length < 16) {
                      alert('Por favor completa la fecha y hora en formato DD/MM/YYYY hh:mm');
                      return;
                    }

                    const date = parseCitaInput(inputValue);
                    if (!date) {
                      alert('Fecha y hora inválidas');
                      return;
                    }

                    setSavingCita(true);
                    try {
                      const isoString = date.toISOString();

                      // Actualizar el estado
                      await airtableService.updateRegistro(
                        pendingEstadoChange.registroId,
                        { estado: pendingEstadoChange.newEstado, cita: isoString }
                      );

                      // Actualizar el estado local
                      const updatedRegistros = registros.map((r) =>
                        r.id === pendingEstadoChange.registroId
                          ? { ...r, estado: pendingEstadoChange.newEstado, cita: isoString }
                          : r
                      );
                      setRegistros(updatedRegistros);

                      // Actualizar el registro seleccionado
                      if (selectedRegistro && selectedRegistro.id === pendingEstadoChange.registroId) {
                        setSelectedRegistro({
                          ...selectedRegistro,
                          estado: pendingEstadoChange.newEstado,
                          cita: isoString
                        });
                      }

                      // Cerrar el modal
                      setShowCitaModal(false);
                      setPendingEstadoChange(null);
                    } catch (error) {
                      alert('Error al guardar');
                    } finally {
                      setSavingCita(false);
                    }
                  }}
                  disabled={savingCita}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setShowCitaModal(false);
                    setPendingEstadoChange(null);
                  }}
                  disabled={savingCita}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
