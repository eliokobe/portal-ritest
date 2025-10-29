import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Search, Info, X, Check, XCircle, Eye, FileText, Wrench, Phone, ArrowUp } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

interface Service {
  id: string;
  expediente?: string;
  fechaRegistro?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
  estadoIpas?: string;
  ultimoCambio?: string;
  descripcion?: string;
  comentarios?: string;
  materialEnviado?: string;
  cita?: string;
  tecnico?: string;
  notaTecnico?: string;
  citaTecnico?: string;
  chatbot?: string;
}

// Filtros permitidos para todos los usuarios (estados que se muestran en la tabla)
const GESTORA_OPERATIVA_FILTROS = [
  'Contactado',
  'Formulario completado',
  'Llamado',
  'Pendiente de asignar',
  'Pendiente de aceptación',
  'Aceptado',
  'Citado',
  'Pendiente de material',
  'Pendiente presupuesto',
  'En curso'
];

// Estados permitidos para Estado Ipas
const IPAS_STATUS_OPTIONS = [
  'Sin citar',
  'Citado',
  'Información visita',
  'Pendiente facturar',
  'Facturado',
  'Cancelado',
];

const STATUS_OPTIONS = [
  'Contactado',
  'Formulario completado',
  'Llamado',
  'Pendiente de asignar',
  'Pendiente de aceptación',
  'Aceptado',
  'Citado',
  'Pendiente de material',
  'Pendiente presupuesto',
  'En curso',
  'Finalizado',
  'Cancelado'
];

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

const Services: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>(''); // Filtro por estado
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedFormulario, setSelectedFormulario] = useState<any | null>(null);
  const [selectedReparacion, setSelectedReparacion] = useState<any | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Determinar si el usuario es Gestora Operativa
  const isGestoraOperativa = user?.role === 'Gestora Operativa';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      try {
        const data = await airtableService.getServices(user?.clinic, user?.id);
        if (isMounted) {
          setServices(data);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
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
  }, [user?.clinic]);

  const ALLOWED_STATES = [
    'Sin contactar',
    'Formulario enviado',
    'Formulario completado',
    'Pendiente de aceptación',
    'Aceptado',
    'Citado',
    'Pendiente de material',
    'En curso'
  ];

  // Filtrado de servicios - mismo para todos los usuarios (como Gestor Operativa)
  const filteredServices = useMemo<Service[]>(() => {
    let servicesWithAllowedStates = services;
    
    // Filtrar por estados permitidos (excluyendo Finalizados, Pendiente de valoración, Valorados, Cancelador)
    servicesWithAllowedStates = services.filter(service =>
      service.estado && GESTORA_OPERATIVA_FILTROS.includes(service.estado)
    );

    // Aplicar filtro por estado seleccionado
    if (estadoFilter) {
      servicesWithAllowedStates = servicesWithAllowedStates.filter(
        service => service.estado === estadoFilter
      );
    }

    const term = searchTerm.trim().toLowerCase();
    const filtered = term ? servicesWithAllowedStates.filter((service) => {
      const matchesExpediente = service.expediente?.toLowerCase().includes(term);
      const matchesNombre = service.nombre?.toLowerCase().includes(term);
      const matchesTelefono = service.telefono?.toLowerCase().includes(term);
      const matchesDireccion = service.direccion?.toLowerCase().includes(term);
      const matchesEstado = service.estado?.toLowerCase().includes(term);
      const matchesEstadoIpas = service.estadoIpas?.toLowerCase().includes(term);

      return (
        matchesExpediente ||
        matchesNombre ||
        matchesTelefono ||
        matchesDireccion ||
        matchesEstado ||
        matchesEstadoIpas
      );
    }) : servicesWithAllowedStates;

    // Ordenar por fecha de registro, del más antiguo al más reciente
    const finalFiltered = filtered.sort((a, b) => {
      const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return dateA - dateB; // Orden ascendente (más antiguo primero)
    });

    console.log('Services - Final filtered services:', finalFiltered.length);
    return finalFiltered;
  }, [services, searchTerm, estadoFilter]);

  const handleCloseModal = () => setSelectedService(null);
  
  const handleOpenFormulario = async (expediente?: string) => {
    if (!expediente) return;
    try {
      const data = await airtableService.getFormularioByExpediente(expediente);
      setSelectedFormulario(data);
    } catch (error) {
      console.error('Error fetching formulario:', error);
    }
  };

  const handleOpenReparacion = async (expediente?: string) => {
    if (!expediente) return;
    try {
      const data = await airtableService.getReparacionesByExpediente(expediente);
      setSelectedReparacion(data);
    } catch (error) {
      console.error('Error fetching reparacion:', error);
    }
  };

  const handleCloseFormulario = () => setSelectedFormulario(null);
  const handleCloseReparacion = () => setSelectedReparacion(null);

  const handleEdit = (serviceId: string, field: string, currentValue: string) => {
    setEditingField({ id: serviceId, field });
    setEditValue(currentValue || '');
  };

  const handleSave = async (serviceId: string, field: string) => {
    if (saving) return;
    
    setSaving(true);
    try {
      // Actualizar en Airtable
      if (field === 'estado') {
        await airtableService.updateServiceStatus(serviceId, editValue);
      } else if (field === 'comentarios') {
        await airtableService.updateServiceComments(serviceId, editValue);
      } else {
        // Para otros campos, usar el método genérico
        await airtableService.updateServiceField(serviceId, field, editValue);
      }
      
      // Actualizar estado local
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === serviceId
            ? { ...service, [field]: editValue }
            : service
        )
      );
      
      // Actualizar servicio seleccionado si está abierto
      if (selectedService?.id === serviceId) {
        setSelectedService(prev => prev ? { ...prev, [field]: editValue } : null);
      }
      
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSaveFormulario = async (formId: string, field: string) => {
    if (saving) return;
    
    setSaving(true);
    try {
      await airtableService.updateFormularioField(formId, field, editValue);
      
      // Actualizar el formulario seleccionado
      if (selectedFormulario?.id === formId) {
        setSelectedFormulario((prev: any) => prev ? { ...prev, [field]: editValue } : null);
      }
      
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating formulario field:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReparacion = async (repId: string, field: string) => {
    if (saving) return;
    
    setSaving(true);
    try {
      await airtableService.updateReparacionField(repId, field, editValue);
      
      // Actualizar la reparación seleccionada
      if (selectedReparacion?.id === repId) {
        setSelectedReparacion((prev: any) => prev ? { ...prev, [field]: editValue } : null);
      }
      
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating reparacion field:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleEscalar = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que quieres desasignar este servicio?')) {
      return;
    }
    try {
      // Para linked records en Airtable, enviamos un array vacío
      await airtableService.updateServiceLinkedField(serviceId, 'Trabajadores', []);
      // Recargar servicios para reflejar el cambio
      const data = await airtableService.getServices(user?.clinic, user?.id);
      setServices(data);
      alert('Servicio desasignado correctamente');
    } catch (error) {
      console.error('Error escalando servicio:', error);
      alert('Error al escalar el servicio');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatDateTimeForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format to YYYY-MM-DDTHH:MM for datetime-local input
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
          <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-600 mt-2">Consulta y gestiona los servicios activos de punto de recarga.</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por expediente, nombre, teléfono, dirección, estado o estado Ipas..."
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filtro por estado para todos los usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label htmlFor="estadoFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Filtrar por estado:
          </label>
          <select
            id="estadoFilter"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {GESTORA_OPERATIVA_FILTROS.map((estado: string) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Info className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay servicios para mostrar en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expediente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Ipas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Cambio</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{service.expediente || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.fechaRegistro)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-40"><div className="max-w-[10rem] truncate">{service.nombre || '-'}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{service.telefono || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-48"><div className="max-w-[12rem] truncate">{service.direccion || '-'}</div></td>
                    <td className="px-4 py-3">
                      {editingField?.id === service.id && editingField?.field === 'estado' ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="text-sm px-2 py-1 border rounded focus:ring-1 focus:ring-brand-primary w-full"
                            disabled={saving}
                            autoFocus
                          >
                            <option value="">Seleccionar...</option>
                            {/* Todos los usuarios pueden seleccionar cualquier estado */}
                            {STATUS_OPTIONS.map((opt: string) => 
                              <option key={opt} value={opt}>{opt}</option>
                            )}
                          </select>
                          <button onClick={() => handleSave(service.id, 'estado')} disabled={saving} className="text-green-600 hover:text-green-800 flex-shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="text-red-600 hover:text-red-800 flex-shrink-0">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEdit(service.id, 'estado', service.estado || '')}
                          className="text-sm text-gray-900 cursor-pointer hover:text-brand-primary transition-colors truncate"
                        >
                          {service.estado || 'Sin estado'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingField?.id === service.id && editingField?.field === 'estadoIpas' ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="text-sm px-2 py-1 border rounded focus:ring-1 focus:ring-brand-primary w-full"
                            disabled={saving}
                            autoFocus
                          >
                            <option value="">Seleccionar...</option>
                            {(IPAS_STATUS_OPTIONS).map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <button onClick={() => handleSave(service.id, 'estadoIpas')} disabled={saving} className="text-green-600 hover:text-green-800 flex-shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="text-red-600 hover:text-red-800 flex-shrink-0">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleEdit(service.id, 'estadoIpas', service.estadoIpas || '')}
                          className="text-sm text-gray-900 cursor-pointer hover:text-brand-primary transition-colors truncate"
                        >
                          {service.estadoIpas || 'Sin estado'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.ultimoCambio)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedService(service)}
                          className="inline-flex items-center justify-center p-2 rounded-full text-brand-primary hover:bg-brand-primary hover:text-white transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenFormulario(service.expediente)}
                          className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                          title="Ver formulario"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        {/* Ocultar botón de reparaciones para Gestora Técnica */}
                        {!isGestoraTecnica && (
                          <button
                            type="button"
                            onClick={() => handleOpenReparacion(service.expediente)}
                            className="inline-flex items-center justify-center p-2 rounded-full text-green-700 hover:bg-green-700 hover:text-white transition-all"
                            title="Ver reparaciones"
                          >
                            <Wrench className="h-5 w-5" />
                          </button>
                        )}
                        {/* Botón de llamar al cliente */}
                        {service.telefono && (
                          <a
                            href={`tel:${service.telefono}`}
                            className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                            title="Llamar al cliente"
                          >
                            <Phone className="h-5 w-5" />
                          </a>
                        )}
                        {/* Botón de escalar servicio */}
                        <button
                          type="button"
                          onClick={() => handleEscalar(service.id)}
                          className="inline-flex items-center justify-center p-2 rounded-full text-orange-600 hover:bg-orange-600 hover:text-white transition-all"
                          title="Escalar servicio"
                        >
                          <ArrowUp className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Cerrar detalles"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Detalle del servicio</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Expediente {selectedService.expediente || 'sin expediente asignado'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Nombre</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.nombre)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.telefono)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha de registro</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.fechaRegistro))}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Dirección</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.direccion)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs uppercase text-gray-500">Estado</p>
                    <button
                      onClick={() => handleEdit(selectedService.id, 'estado', selectedService.estado || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedService.id && editingField?.field === 'estado' ? (
                    <div className="space-y-2">
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                        autoFocus
                      >
                        <option value="">Seleccionar estado...</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(selectedService.id, 'estado')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.estado)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Último cambio</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.ultimoCambio))}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">Descripción</h3>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.descripcion)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Comentarios</h3>
                    <button
                      onClick={() => handleEdit(selectedService.id, 'comentarios', selectedService.comentarios || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedService.id && editingField?.field === 'comentarios' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        rows={3}
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(selectedService.id, 'comentarios')}
                          disabled={saving}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.comentarios)}</p>
                  )}
                </div>
                {/* Material enviado - oculto para Gestora Operativa */}
                {!isGestoraOperativa && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Material enviado</h3>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.materialEnviado)}</p>
                  </div>
                )}
                {/* Primera fila: Cita y Cita técnico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cita - editable */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-700">Cita</h3>
                      <button
                        onClick={() => handleEdit(selectedService.id, 'cita', formatDateTimeForInput(selectedService.cita))}
                        className="text-xs text-brand-primary hover:text-brand-green"
                      >
                        Editar
                      </button>
                    </div>
                    {editingField?.id === selectedService.id && editingField?.field === 'cita' ? (
                      <div className="space-y-2">
                        <input
                          type="datetime-local"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                          disabled={saving}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(selectedService.id, 'cita')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                            Guardar
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.cita)}</p>
                    )}
                  </div>
                  {/* Cita técnico - siempre visible, solo lectura */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Cita técnico</h3>
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedService.citaTecnico)}</p>
                  </div>
                </div>

                {/* Segunda fila: Técnico y Nota técnico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-700">Técnico</h3>
                      <button
                        onClick={() => handleEdit(selectedService.id, 'tecnico', selectedService.tecnico || '')}
                        className="text-xs text-brand-primary hover:text-brand-green"
                      >
                        Editar
                      </button>
                    </div>
                    {editingField?.id === selectedService.id && editingField?.field === 'tecnico' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                          disabled={saving}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(selectedService.id, 'tecnico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                            Guardar
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedService.tecnico)}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-700">Nota técnico</h3>
                      <button
                        onClick={() => handleEdit(selectedService.id, 'notaTecnico', selectedService.notaTecnico || '')}
                        className="text-xs text-brand-primary hover:text-brand-green"
                      >
                        Editar
                      </button>
                    </div>
                    {editingField?.id === selectedService.id && editingField?.field === 'notaTecnico' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                          rows={2}
                          disabled={saving}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(selectedService.id, 'notaTecnico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                            Guardar
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.notaTecnico)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulario */}
      {selectedFormulario && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseFormulario}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseFormulario}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Formulario</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Expediente {selectedFormulario.Expediente || 'sin expediente asignado'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Problema</h3>
                    <button
                      onClick={() => handleEdit(selectedFormulario.id, 'problema', selectedFormulario.Problema || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedFormulario.id && editingField?.field === 'problema' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        rows={3}
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveFormulario(selectedFormulario.id, 'Problema')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedFormulario.Problema)}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Detalles</h3>
                    <button
                      onClick={() => handleEdit(selectedFormulario.id, 'detalles', selectedFormulario.Detalles || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedFormulario.id && editingField?.field === 'detalles' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        rows={3}
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveFormulario(selectedFormulario.id, 'Detalles')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedFormulario.Detalles)}</p>
                  )}
                </div>

                {/* Archivos adjuntos */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Archivos adjuntos</h3>
                  <div className="space-y-2">
                    {selectedFormulario['Archivo 1'] && Array.isArray(selectedFormulario['Archivo 1']) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Archivo 1:</span>
                        {selectedFormulario['Archivo 1'].map((file: AirtableAttachment, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {file.filename || 'Descargar'}
                          </a>
                        ))}
                      </div>
                    )}
                    {selectedFormulario['Archivo 2'] && Array.isArray(selectedFormulario['Archivo 2']) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Archivo 2:</span>
                        {selectedFormulario['Archivo 2'].map((file: AirtableAttachment, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {file.filename || 'Descargar'}
                          </a>
                        ))}
                      </div>
                    )}
                    {selectedFormulario['Archivo 3'] && Array.isArray(selectedFormulario['Archivo 3']) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Archivo 3:</span>
                        {selectedFormulario['Archivo 3'].map((file: AirtableAttachment, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {file.filename || 'Descargar'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fotos */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Fotos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Foto general */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Foto general</h4>
                      {selectedFormulario['Foto general'] && Array.isArray(selectedFormulario['Foto general']) && selectedFormulario['Foto general'].length > 0 ? (
                        <div className="space-y-2">
                          {selectedFormulario['Foto general'].map((file: AirtableAttachment, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline block"
                              >
                                Descargar
                              </a>
                              {file.thumbnails?.large?.url && (
                                <img
                                  src={file.thumbnails.large.url}
                                  alt="Foto general"
                                  className="w-full h-auto object-cover rounded border"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin foto</p>
                      )}
                    </div>

                    {/* Foto etiqueta */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Foto etiqueta</h4>
                      {selectedFormulario['Foto etiqueta'] && Array.isArray(selectedFormulario['Foto etiqueta']) && selectedFormulario['Foto etiqueta'].length > 0 ? (
                        <div className="space-y-2">
                          {selectedFormulario['Foto etiqueta'].map((file: AirtableAttachment, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline block"
                              >
                                Descargar
                              </a>
                              {file.thumbnails?.large?.url && (
                                <img
                                  src={file.thumbnails.large.url}
                                  alt="Foto etiqueta"
                                  className="w-full h-auto object-cover rounded border"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin foto</p>
                      )}
                    </div>

                    {/* Foto roto */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-2">Foto roto</h4>
                      {selectedFormulario['Foto roto'] && Array.isArray(selectedFormulario['Foto roto']) && selectedFormulario['Foto roto'].length > 0 ? (
                        <div className="space-y-2">
                          {selectedFormulario['Foto roto'].map((file: AirtableAttachment, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline block"
                              >
                                Descargar
                              </a>
                              {file.thumbnails?.large?.url && (
                                <img
                                  src={file.thumbnails.large.url}
                                  alt="Foto roto"
                                  className="w-full h-auto object-cover rounded border"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sin foto</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reparaciones */}
      {selectedReparacion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseReparacion}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseReparacion}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Cerrar reparaciones"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Reparaciones</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Expediente {selectedReparacion.expediente || 'sin expediente asignado'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Técnico</h3>
                    <button
                      onClick={() => handleEdit(selectedReparacion.id, 'tecnico-rep', selectedReparacion.tecnico || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedReparacion.id && editingField?.field === 'tecnico-rep' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Técnico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedReparacion.tecnico)}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Resultado</h3>
                    <button
                      onClick={() => handleEdit(selectedReparacion.id, 'resultado', selectedReparacion.resultado || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedReparacion.id && editingField?.field === 'resultado' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Resultado')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedReparacion.resultado)}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Reparación</h3>
                    <button
                      onClick={() => handleEdit(selectedReparacion.id, 'reparacion', selectedReparacion.reparacion || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedReparacion.id && editingField?.field === 'reparacion' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Reparación')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedReparacion.reparacion)}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Cuadro eléctrico</h3>
                    <button
                      onClick={() => handleEdit(selectedReparacion.id, 'cuadroElectrico', selectedReparacion.cuadroElectrico || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedReparacion.id && editingField?.field === 'cuadroElectrico' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Cuadro eléctrico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedReparacion.cuadroElectrico)}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-700">Problema</h3>
                  <button
                    onClick={() => handleEdit(selectedReparacion.id, 'problema-rep', selectedReparacion.problema || '')}
                    className="text-xs text-brand-primary hover:text-brand-green"
                  >
                    Editar
                  </button>
                </div>
                {editingField?.id === selectedReparacion.id && editingField?.field === 'problema-rep' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                      rows={3}
                      disabled={saving}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Problema')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                        Guardar
                      </button>
                      <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedReparacion.problema)}</p>
                )}
              </div>

              {/* Foto */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Foto</h3>
                {selectedReparacion.foto && Array.isArray(selectedReparacion.foto) && selectedReparacion.foto.length > 0 ? (
                  <div className="space-y-2">
                    {selectedReparacion.foto.map((file: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {file.filename || 'Descargar foto'}
                        </a>
                        {file.thumbnails?.large?.url && (
                          <img
                            src={file.thumbnails.large.url}
                            alt="Foto de reparación"
                            className="w-32 h-32 object-cover rounded border"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin foto disponible</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
