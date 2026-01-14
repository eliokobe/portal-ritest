import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, XCircle } from 'lucide-react';
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
}

const STATUS_OPTIONS = [
  'Contactado',
  'Formulario completado',
  'Llamado',
  'Pendiente de asignar',
  'Pendiente de aceptación',
  'Aceptado',
  'Citado',
  'Pendiente técnico',
  'Pendiente de material',
  'Pendiente presupuesto',
  'Presupuesto enviado',
  'Material enviado',
  'Finalizado',
  'Cancelado'
];

const SEGUIMIENTO_OPTIONS = [
  'Sin contactar',
  'Contactado',
  'Primer recordatorio asistencia',
  'Segundo recordatorio asistencia',
  'Formulario enviado',
  'Primer recordatorio formulario',
  'Segundo recordatorio formulario',
  'Primer recordatorio cita',
  'Primer recordatorio asignación',
  'Ilocalizable',
  'Recordatorio llamada'
];

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

const getSeguimientoColors = (seguimiento?: string) => {
  switch (seguimiento) {
    case 'Sin contactar':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    case 'Contactado':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'Primer recordatorio asistencia':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'Segundo recordatorio asistencia':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'Formulario enviado':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'Primer recordatorio formulario':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'Segundo recordatorio formulario':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'Primer recordatorio cita':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'Primer recordatorio asignación':
      return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
    case 'Ilocalizable':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    case 'Recordatorio llamada':
      return { bg: 'bg-pink-100', text: 'text-pink-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};

const SeguimientoTecnicos: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; nombre?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('SeguimientoTecnicos - Starting to load reparaciones...');
        console.log('User info:', { email: user?.email, role: user?.role, id: user?.id });
        
        const data = await airtableService.getReparaciones(user?.clinic);
        console.log('SeguimientoTecnicos - Reparaciones received:', data.length, 'records');
        
        if (isMounted) {
          setServices(data);
        }
      } catch (error: any) {
        console.error('SeguimientoTecnicos - Error fetching data:', error);
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
        if (isMounted) {
          setTechnicians(data);
        }
      } catch (err) {
        console.error('SeguimientoTecnicos - Error cargando técnicos:', err);
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
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService]);

  const technicianMap = useMemo(() => {
    return technicians.reduce<Record<string, string>>((acc, t) => {
      if (t.id && t.nombre) {
        acc[t.id] = t.nombre;
      }
      return acc;
    }, {});
  }, [technicians]);

  const getTechnicianName = (service: Service): string => {
    if (!service) return '-';
    if (typeof service.tecnico === 'string') return service.tecnico || '-';
    if (Array.isArray(service.tecnico)) {
      const names = service.tecnico.map((id) => technicianMap[id]).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '-';
    }
    return '-';
  };

  const handleEstadoChange = async (service: Service, newEstado: string) => {
    if (!service || !newEstado || newEstado === service.estado) return;
    setSaving(true);
    try {
      await airtableService.updateServiceField(service.id, 'Estado', newEstado, 'Reparaciones');
      setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, estado: newEstado } : s)));
      setSelectedService((prev) => (prev && prev.id === service.id ? { ...prev, estado: newEstado } : prev));
    } catch (err) {
      console.error('SeguimientoTecnicos - Error actualizando estado:', err);
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
      console.error('SeguimientoTecnicos - Error actualizando seguimiento:', err);
      alert('Error al actualizar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar reparaciones por término de búsqueda
  const filteredServices = useMemo(() => {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const allowedStates = new Set(['Asignado', 'Aceptado', 'Rechazado']);

    let filtered = services.filter((service) => {
      const estadoValido = service.estado && allowedStates.has(service.estado);
      const fechaEstadoDate = service.fechaEstado ? new Date(service.fechaEstado) : null;
      const fechaValida = fechaEstadoDate !== null && fechaEstadoDate < fortyEightHoursAgo;
      return estadoValido && fechaValida;
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
  }, [services, searchTerm]);

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
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando seguimiento de técnicos...</p>
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

      <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seguimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha seguimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.cliente || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(service.fechaSeguimiento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 space-y-6 bg-white rounded-lg">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Detalle de la reparación</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedService.expediente ? `Expediente ${selectedService.expediente}` : 'Sin expediente asignado'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Cliente</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.cliente)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.telefono)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Técnico</p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">
                    {renderDetailValue(getTechnicianName(selectedService))}
                  </p>
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
                  <p className="text-xs uppercase text-gray-500">Número de serie</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.numeroSerie)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Resultado</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.resultado)}</p>
                </div>
              </div>

              {/* Detalles adicionales */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información adicional</h3>
                <div className="space-y-4">
                  {selectedService.reparacion && (
                    <div>
                      <p className="text-xs uppercase text-gray-500">Reparación</p>
                      <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">
                        {selectedService.reparacion}
                      </p>
                    </div>
                  )}

                  {selectedService.detalles && (
                    <div>
                      <p className="text-xs uppercase text-gray-500">Detalles</p>
                      <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">
                        {selectedService.detalles}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeguimientoTecnicos;
