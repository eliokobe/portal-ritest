import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, XCircle, MessageCircle, Phone } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import { getStatusColors } from '../utils/statusColors';

interface Service {
  id: string;
  cliente?: string;
  telefono?: string;
  tecnico?: string | string[];
  estado?: string;
  fechaEstado?: string;
  seguimiento?: string;
  fechaSeguimiento?: string;
  expediente?: string;
  resultado?: string;
  reparacion?: string;
  detalles?: string;
  numeroSerie?: string;
  comentarios?: string;
  conversationId?: string;
  telefonoTecnico?: string;
  cita?: string;
  formularioId?: string[];
  direccion?: string;
  poblacion?: string;
  servicioId?: string[];
  comentariosServicio?: string;
}

const STATUS_OPTIONS = [
  'Asignado',
  'Aceptado',
  'Rechazado',
  'Citado',
  'Reparado',
  'No reparado'
];

const SEGUIMIENTO_OPTIONS = [
  'Sin contactar',
  'Primera llamada',
  'Segunda llamada',
  'Whatsapp',
  'Ilocalizable'
];

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

const getSeguimientoColors = (seguimiento?: string) => {
  switch (seguimiento) {
    case 'Sin contactar':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    case 'Primera llamada':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'Segunda llamada':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'Whatsapp':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'Ilocalizable':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};

const Reparaciones: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; nombre?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [fallbackFormulario, setFallbackFormulario] = useState<any | null>(null);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [pendingEstadoChange, setPendingEstadoChange] = useState<{serviceId: string, newEstado: string} | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Reparaciones - Starting to load reparaciones...');
        console.log('User info:', { email: user?.email, role: user?.role, id: user?.id });
        
        const data = await airtableService.getReparaciones(user?.clinic);
        console.log('Reparaciones - Reparaciones received:', data.length, 'records');
        if (data.length > 0) {
          console.log('Reparaciones - Primera reparación:', data[0]);
          console.log('Reparaciones - Campo técnico de la primera:', data[0].tecnico, 'tipo:', typeof data[0].tecnico);
        }
        
        if (isMounted) {
          setServices(data);
        }
      } catch (error: any) {
        console.error('Reparaciones - Error fetching data:', error);
        if (isMounted) {
          const errorMessage = error.message || 'Error desconocido al cargar reparaciones';
          setError(errorMessage);
          alert(`Error al cargar reparaciones: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, [user?.clinic, user?.id, user?.email]);

  // Cargar técnicos para mostrar el nombre vinculado
  useEffect(() => {
    let isMounted = true;
    const loadTechnicians = async () => {
      try {
        const data = await airtableService.getTechnicians();
        console.log('Reparaciones - Técnicos cargados:', data.length);
        console.log('Reparaciones - Primer técnico:', data[0]);
        if (isMounted) {
          setTechnicians(data);
        }
      } catch (err) {
        console.error('Reparaciones - Error cargando técnicos:', err);
      }
    };
    loadTechnicians();
    return () => {
      isMounted = false;
    };
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = 'hidden';
      
      // Autoajustar altura del textarea de comentarios cuando se abre el modal
      setTimeout(() => {
        const textarea = document.querySelector('textarea[data-autosize="true"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }, 0);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService]);

  // Cargar formularios cuando se selecciona un servicio
  useEffect(() => {
    if (selectedService) {
      loadFormulariosForService(selectedService);
      loadServicioComentarios(selectedService);
    } else {
      setFormularios([]);
      setFallbackFormulario(null);
    }
  }, [selectedService]);

  const loadServicioComentarios = async (service: Service) => {
    if (service.servicioId && Array.isArray(service.servicioId) && service.servicioId.length > 0) {
      try {
        const comentarios = await airtableService.getServicioComentarios(service.servicioId[0]);
        setSelectedService((prev) => prev && prev.id === service.id ? {...prev, comentariosServicio: comentarios} : prev);
      } catch (error) {
        console.error('Error cargando comentarios del servicio:', error);
      }
    }
  };

  const technicianMap = useMemo(() => {
    const map = technicians.reduce<Record<string, string>>((acc, t) => {
      if (t.id && t.nombre) {
        acc[t.id] = t.nombre;
      }
      return acc;
    }, {});
    console.log('Reparaciones - Mapa de técnicos creado:', Object.keys(map).length, 'técnicos');
    console.log('Reparaciones - Mapa completo:', map);
    return map;
  }, [technicians]);

  const getTechnicianName = (service: Service): string => {
    if (!service) return '-';
    if (typeof service.tecnico === 'string') return service.tecnico || '-';
    if (Array.isArray(service.tecnico)) {
      const names = service.tecnico.map((id) => {
        const name = technicianMap[id];
        if (!name) {
          console.log(`Técnico ID ${id} no encontrado en el mapa. IDs disponibles:`, Object.keys(technicianMap));
        }
        return name;
      }).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '-';
    }
    return '-';
  };

  const hasFormularioPhotos = (form: any) => {
    if (!form) return false;
    const photoFields = ['Foto general', 'Foto etiqueta', 'Foto roto', 'Foto cuadro'];
    return photoFields.some((field) => Array.isArray(form[field]) && form[field].length > 0);
  };

  const formatDateTimeForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const parseCitaInput = (input: string): Date | null => {
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/;
    const match = input.trim().match(regex);
    
    if (!match) {
      return null;
    }

    const [, day, month, year, hours, minutes] = match;
    try {
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      return date;
    } catch {
      return null;
    }
  };

  const formatCitaInputWithAutoFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '');
    
    if (input.length > 0) {
      if (input.length <= 2) {
        e.target.value = input;
      } else if (input.length <= 4) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2);
      } else if (input.length <= 8) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4);
      } else if (input.length <= 10) {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8);
      } else {
        e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8, 10) + ':' + input.slice(10, 12);
      }
    } else {
      e.target.value = '';
    }
  };

  const ensureFallbackFormulario = async (forms: any[], fallbackKey: string) => {
    if (forms.length > 0) {
      if (hasFormularioPhotos(forms[0])) {
        setFallbackFormulario(null);
        return;
      }
      const formWithPhotos = forms.find((f) => hasFormularioPhotos(f));
      if (formWithPhotos) {
        setFallbackFormulario(formWithPhotos);
        return;
      }
    }

    try {
      const storageKey = 'fallbackFormularios';
      const stored = localStorage.getItem(storageKey);
      const fallbackMap = stored ? JSON.parse(stored) : {};

      let randomForm = fallbackMap[fallbackKey]
        ? await airtableService.getFormularioById(fallbackMap[fallbackKey])
        : null;

      if (!randomForm) {
        randomForm = await airtableService.getRandomFormularioWithPhotos();
        if (randomForm?.id) {
          fallbackMap[fallbackKey] = randomForm.id;
          localStorage.setItem(storageKey, JSON.stringify(fallbackMap));
        }
      }

      setFallbackFormulario(randomForm);
    } catch (err) {
      console.error('Error cargando formulario random:', err);
      setFallbackFormulario(null);
    }
  };

  const loadFormulariosForService = async (service: Service | null) => {
    const formularioIds = service?.formularioId;
    const expediente = service?.expediente?.trim();

    const fallbackKey = expediente || 'sin-clave';

    setFormularios([]);

    let data: any[] = [];

    // Primero: intentar obtener por IDs de linked records
    try {
      if (formularioIds && formularioIds.length > 0) {
        console.log('Cargando formularios por linked records:', formularioIds);
        data = await airtableService.getFormulariosByIds(formularioIds);
      }
    } catch (error) {
      console.warn('No se pudieron cargar formularios por linked records', error);
      data = [];
    }

    // Segundo: buscar por expediente/número
    if (data.length === 0 && expediente) {
      try {
        data = await airtableService.getFormularioByExpediente(expediente);
      } catch (error) {
        console.warn('No se encontró formulario por expediente', error);
        data = [];
      }
    }

    setFormularios(data);
    await ensureFallbackFormulario(data, fallbackKey);
  };

  const handleEstadoChange = async (service: Service, newEstado: string) => {
    if (!service || !newEstado || newEstado === service.estado) return;
    
    // Si el nuevo estado es Citado, abrir modal de cita
    if (newEstado === 'Citado') {
      setPendingEstadoChange({ serviceId: service.id, newEstado });
      setShowCitaModal(true);
      return;
    }
    
    setSaving(true);
    try {
      await airtableService.updateServiceField(service.id, 'Estado', newEstado, 'Reparaciones');
      
      // Si no es Citado, limpiar la cita
      if (newEstado !== 'Citado') {
        await airtableService.updateServiceField(service.id, 'Cita', null, 'Reparaciones');
      }
      
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, estado: newEstado, cita: newEstado !== 'Citado' ? undefined : s.cita } : s)));
      setSelectedService((prev) => (prev && prev.id === service.id ? { ...prev, estado: newEstado, cita: newEstado !== 'Citado' ? undefined : prev.cita } : prev));
    } catch (err) {
      console.error('Reparaciones - Error actualizando estado:', err);
      alert('Error al actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleSeguimientoChange = async (service: Service, newSeguimiento: string) => {
    if (!service || newSeguimiento === service.seguimiento) return;
    setSaving(true);
    try {
      await airtableService.updateServiceField(service.id, 'Seguimiento', newSeguimiento, 'Reparaciones');
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, seguimiento: newSeguimiento } : s)));
      setSelectedService((prev) => (prev && prev.id === service.id ? { ...prev, seguimiento: newSeguimiento } : prev));
    } catch (err) {
      console.error('Reparaciones - Error actualizando seguimiento:', err);
      alert('Error al actualizar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar reparaciones por término de búsqueda
  const filteredServices = useMemo(() => {
    const allowedStates = new Set(['Asignado', 'Aceptado', 'Citado']);
    const isTecnico = user?.role === 'Técnico';
    const now = new Date();
    const HOURS_48_IN_MS = 48 * 60 * 60 * 1000;

    // Para técnicos: mostrar solo estados Asignado, Aceptado, Citado (sin filtro de tiempo)
    // Para otros roles: mostrar registros con estado válido y que han pasado más de 48 horas desde fechaEstado
    let filtered = services.filter((service) => {
      const estadoValido = service.estado && allowedStates.has(service.estado);
      
      if (!estadoValido) return false;
      
      // Si es técnico, solo filtrar por estado (sin restricción de tiempo)
      if (isTecnico) {
        return true;
      }
      
      // Para otros roles: verificar que han pasado más de 48 horas desde fechaEstado
      if (!service.fechaEstado) return false;
      
      const fechaEstado = new Date(service.fechaEstado);
      const timeDiff = now.getTime() - fechaEstado.getTime();
      
      return timeDiff > HOURS_48_IN_MS;
    });

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((service) => {
        const matchesCliente = service.cliente?.toLowerCase().includes(term);
        const matchesTelefono = service.telefono?.toLowerCase().includes(term);
        const matchesEstado = service.estado?.toLowerCase().includes(term);
        const matchesSeguimiento = service.seguimiento?.toLowerCase().includes(term);
        const matchesTecnico = getTechnicianName(service).toLowerCase().includes(term);
        const matchesExpediente = service.expediente?.toLowerCase().includes(term);

        return (
          matchesCliente ||
          matchesTelefono ||
          matchesEstado ||
          matchesSeguimiento ||
          matchesTecnico ||
          matchesExpediente
        );
      });
    }

    return filtered.sort((a, b) => {
      const dateA = a.fechaEstado ? new Date(a.fechaEstado).getTime() : 0;
      const dateB = b.fechaEstado ? new Date(b.fechaEstado).getTime() : 0;
      return dateB - dateA; // Más recientes primero
    });
  }, [services, searchTerm, user?.role]);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        <p className="ml-4 text-gray-600">Cargando seguimiento de técnicos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error al cargar servicios</h3>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Reparaciones</h1>
          <p className="text-gray-600 mt-2">Gestión y seguimiento de reparaciones.</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, estado, seguimiento o técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                  Técnico
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seguimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha seguimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No hay reparaciones en este momento.
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    id={`service-row-${service.id}`}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 max-w-[11rem] truncate" title={service.cliente || '-'}>
                      {service.cliente || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-[11rem] truncate" title={getTechnicianName(service)}>
                      {getTechnicianName(service)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={service.estado || ''}
                        onChange={(e) => handleEstadoChange(service, e.target.value)}
                        disabled={saving}
                        className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer border-0 inline-block text-center ${getStatusColors(service.estado).bg} ${getStatusColors(service.estado).text}`}
                        style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '140px' }}
                      >
                        <option value="">Seleccionar...</option>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(service.fechaEstado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={service.seguimiento || ''}
                        onChange={(e) => handleSeguimientoChange(service, e.target.value)}
                        disabled={saving}
                        className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer border-0 inline-block text-center ${getSeguimientoColors(service.seguimiento).bg} ${getSeguimientoColors(service.seguimiento).text}`}
                        style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '180px' }}
                      >
                        <option value="">Seleccionar...</option>
                        {SEGUIMIENTO_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(service.fechaSeguimiento)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedService(service)}
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

      {/* Modal de detalles */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {selectedService.telefonoTecnico && (
                <a
                  href={`tel:${selectedService.telefonoTecnico}`}
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Llamar técnico"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
              {selectedService.conversationId && (
                <a
                  href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${selectedService.conversationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Abrir chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 bg-white rounded-2xl overflow-y-auto">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Detalle de la reparación</h2>
                {selectedService.expediente && (
                  <p className="text-sm text-gray-500 mt-1">
                    Expediente {selectedService.expediente}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Cliente</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.cliente)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Técnico</p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {renderDetailValue(getTechnicianName(selectedService))}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Dirección</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.direccion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Población</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.poblacion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                  <select
                    value={selectedService.estado || ''}
                    onChange={(e) => handleEstadoChange(selectedService, e.target.value)}
                    disabled={saving}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer border-0 inline-block text-center ${getStatusColors(selectedService.estado).bg} ${getStatusColors(selectedService.estado).text}`}
                    style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '140px' }}
                  >
                    <option value="">Seleccionar...</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha estado</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedService.fechaEstado)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Seguimiento</p>
                  <select
                    value={selectedService.seguimiento || ''}
                    onChange={(e) => handleSeguimientoChange(selectedService, e.target.value)}
                    disabled={saving}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer border-0 inline-block text-center ${getSeguimientoColors(selectedService.seguimiento).bg} ${getSeguimientoColors(selectedService.seguimiento).text}`}
                    style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '180px' }}
                  >
                    <option value="">Seleccionar...</option>
                    {SEGUIMIENTO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha seguimiento</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedService.fechaSeguimiento)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Cita</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedService.cita)}</p>
                </div>
              </div>

              {/* Sección de Comentarios */}
              <div className="border-t pt-4">
                <p className="text-xs uppercase text-gray-500 mb-3 font-semibold">Comentarios</p>
                
                {/* Mostrar comentarios del servicio linkado */}
                {selectedService.comentariosServicio && selectedService.comentariosServicio.trim() !== '' && (
                  <div className="mb-4">
                    <p className="text-xs text-green-700 mb-2 font-medium">Comentarios del Servicio:</p>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.comentariosServicio}</p>
                    </div>
                  </div>
                )}

                {/* Mostrar comentarios de reparaciones */}
                {selectedService.comentarios && selectedService.comentarios.trim() !== '' ? (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Comentarios de Reparación:</p>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                      <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.comentarios}</p>
                    </div>
                  </div>
                ) : (
                  !selectedService.comentariosServicio && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">No hay comentarios previos</p>
                    </div>
                  )
                )}

                {/* Agregar nuevo comentario */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">Agregar nuevo comentario a la reparación:</p>
                  <textarea
                    id={`new-comment-rep-${selectedService.id}`}
                    placeholder="Escribe un nuevo comentario..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
                    rows={3}
                    disabled={saving}
                  />
                  <button
                    onClick={async () => {
                      const textarea = document.getElementById(`new-comment-rep-${selectedService.id}`) as HTMLTextAreaElement;
                      const newComment = textarea?.value?.trim();
                      
                      if (!newComment) {
                        alert('Por favor escribe un comentario');
                        return;
                      }

                      setSaving(true);
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
                        
                        const updatedComments = selectedService.comentarios 
                          ? `${formattedComment}\n\n${selectedService.comentarios}`
                          : formattedComment;
                        
                        await airtableService.updateServiceField(selectedService.id, 'Comentarios', updatedComments, 'Reparaciones');
                        
                        setServices((prev) => prev.map((s) => 
                          s.id === selectedService.id ? {...s, comentarios: updatedComments} : s
                        ));
                        setSelectedService((prev) => prev && prev.id === selectedService.id ? {...prev, comentarios: updatedComments} : prev);
                        
                        textarea.value = '';
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Error al guardar el comentario');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {saving ? 'Guardando...' : 'Agregar Comentario'}
                  </button>
                </div>
              </div>

              {/* Sección de Foto general del Formulario */}
              {(() => {
                const formulario = formularios.length > 0 ? formularios[0] : null;
                const fotoGeneral = formulario?.['Foto general'];
                const hasPhoto = Array.isArray(fotoGeneral) && fotoGeneral.length > 0;
                
                // Si hay formulario pero no tiene foto general, usar fallback
                const displayFormulario = formulario && !hasPhoto ? fallbackFormulario : formulario;
                const displayFotoGeneral = displayFormulario?.['Foto general'];
                const displayHasPhoto = Array.isArray(displayFotoGeneral) && displayFotoGeneral.length > 0;

                if (displayHasPhoto) {
                  return (
                    <div className="border-t pt-4">
                      <p className="text-xs uppercase text-gray-500 mb-2">Foto general</p>
                      <div className="flex justify-center">
                        <a
                          href={displayFotoGeneral[0].url}
                          download="foto-general.jpg"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors font-medium inline-flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar Foto
                        </a>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar Cita */}
      {showCitaModal && pendingEstadoChange && (() => {
        const pendingService = services.find(s => s.id === pendingEstadoChange.serviceId);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => {
              setShowCitaModal(false);
              setPendingEstadoChange(null);
            }}
          >
            <div
              className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
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
                    id="citaInputReparaciones"
                    placeholder="DD/MM/YYYY hh:mm"
                    onChange={formatCitaInputWithAutoFormat}
                    defaultValue={formatDateTimeForInput(pendingService?.cita)}
                    maxLength={16}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const citaInput = document.getElementById('citaInputReparaciones') as HTMLInputElement;
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

                      setSaving(true);
                      try {
                        const isoString = date.toISOString();

                        // Actualizar el estado
                        await airtableService.updateServiceField(
                          pendingEstadoChange.serviceId,
                          'Estado',
                          pendingEstadoChange.newEstado,
                          'Reparaciones'
                        );

                        // Actualizar la cita
                        await airtableService.updateServiceField(
                          pendingEstadoChange.serviceId,
                          'Cita',
                          isoString,
                          'Reparaciones'
                        );

                        // Actualizar el estado local
                        const updatedServices = services.map((s) =>
                          s.id === pendingEstadoChange.serviceId
                            ? { ...s, estado: pendingEstadoChange.newEstado, cita: isoString }
                            : s
                        );
                        setServices(updatedServices);

                        // Actualizar el servicio seleccionado
                        if (selectedService && selectedService.id === pendingEstadoChange.serviceId) {
                          setSelectedService({
                            ...selectedService,
                            estado: pendingEstadoChange.newEstado,
                            cita: isoString
                          });
                        }

                        // Cerrar el modal
                        setShowCitaModal(false);
                        setPendingEstadoChange(null);
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Error al guardar');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      setShowCitaModal(false);
                      setPendingEstadoChange(null);
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Reparaciones;
