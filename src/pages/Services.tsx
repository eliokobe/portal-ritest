import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Search, Info, X, Check, XCircle, Eye, Phone, MessageCircle } from 'lucide-react';
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
  estadoEnvio?: string;
  ultimoCambio?: string;
  descripcion?: string;
  comentarios?: string;
  motivoCancelacion?: string;
  cita?: string;
  tecnico?: string;
  trabajadorId?: string[];
  notaTecnico?: string;
  citaTecnico?: string;
  chatbot?: string;
  fechaInstalacion?: string;
  referencia?: string;
  conversationId?: string;
  poblacion?: string;
  tramitado?: boolean;
  codigoPostal?: string;
  provincia?: string;
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
  'Material enviado',
  'Finalizado',
  'Cancelado'
];

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

const getEstadoColor = (estado?: string) => {
  switch (estado) {
    case 'Contactado':
      return 'bg-blue-100 text-blue-800';
    case 'Formulario completado':
      return 'bg-purple-100 text-purple-800';
    case 'Llamado':
      return 'bg-cyan-100 text-cyan-800';
    case 'Pendiente de asignar':
      return 'bg-yellow-100 text-yellow-800';
    case 'Pendiente de aceptación':
      return 'bg-orange-100 text-orange-800';
    case 'Aceptado':
      return 'bg-green-100 text-green-800';
    case 'Citado':
      return 'bg-indigo-100 text-indigo-800';
    case 'Pendiente técnico':
      return 'bg-amber-100 text-amber-800';
    case 'Pendiente de material':
      return 'bg-red-100 text-red-800';
    case 'Pendiente presupuesto':
      return 'bg-pink-100 text-pink-800';
    case 'Material enviado':
      return 'bg-teal-100 text-teal-800';
    case 'Finalizado':
      return 'bg-green-200 text-green-900';
    case 'Cancelado':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

type ServicesVariant = 'servicios' | 'tramitaciones';

const Services: React.FC<{ variant?: ServicesVariant }> = ({ variant = 'servicios' }) => {
  const { user } = useAuth();
  const isTramitacion = variant === 'tramitaciones';
  const isTecnico = user?.role === 'Técnico';
  const [services, setServices] = useState<Service[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'requiere-accion' | 'en-espera'>('requiere-accion');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailsView, setDetailsView] = useState<'detalles' | 'formulario' | 'reparaciones'>('detalles');
  const [formularios, setFormularios] = useState<any[]>([]);
  const [selectedFormularioIndex, setSelectedFormularioIndex] = useState(0);
  const [selectedFormulario, setSelectedFormulario] = useState<any | null>(null);
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [selectedReparacionIndex, setSelectedReparacionIndex] = useState(0);
  const [selectedReparacion, setSelectedReparacion] = useState<any | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [appointmentAlert, setAppointmentAlert] = useState<Service | null>(null);
  const [dismissedAppointmentId, setDismissedAppointmentId] = useState<string | null>(null);
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<string | null>(null);

  // Determinar si el usuario es Gestora Operativa
  const isGestoraOperativa = user?.role === 'Gestora Operativa';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (selectedService || selectedFormulario || selectedReparacion) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService, selectedFormulario, selectedReparacion]);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`${isTramitacion ? 'Tramitaciones' : 'Services'} - Starting to load...`);
        const data = isTramitacion
          ? await airtableService.getTramitaciones(user?.clinic, user?.id, user?.email, { onlyUnsynced: true })
          : await airtableService.getServices(user?.clinic, user?.id, user?.email);
        console.log(`${isTramitacion ? 'Tramitaciones' : 'Services'} - Data received:`, data.length, 'records');
        if (isMounted) {
          setServices(data);
        }
      } catch (error: any) {
        console.error(`${isTramitacion ? 'Tramitaciones' : 'Services'} - Error fetching data:`, error);
        if (isMounted) {
          const errorMessage = error.message || `Error desconocido al cargar ${isTramitacion ? 'tramitaciones' : 'servicios'}`;
          setError(errorMessage);
          alert(`Error al cargar ${isTramitacion ? 'tramitaciones' : 'servicios'}: ${errorMessage}`);
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

  useEffect(() => {
    const loadTecnicos = async () => {
      try {
        const data = await airtableService.getTechnicians();
        setTecnicos(data.filter(t => t.nombre !== undefined) as { id: string; nombre: string; }[]);
      } catch (error) {
        console.error('Error loading técnicos:', error);
      }
    };

    loadTecnicos();
  }, []);

  useEffect(() => {
    if (isTramitacion) return;

    const isCitaNow = (service: Service) => {
      if (!service.cita || service.estado !== 'Citado') return false;
      const citaDate = new Date(service.cita);
      const now = new Date();
      if (isNaN(citaDate.getTime())) return false;
      // Consider "ahora" si es hoy y está dentro de ±10 minutos
      const sameDay = citaDate.toDateString() === now.toDateString();
      const diffMinutes = Math.abs(citaDate.getTime() - now.getTime()) / 60000;
      return sameDay && diffMinutes <= 10;
    };

    const evaluateAlert = () => {
      const match = services.find((s) => isCitaNow(s) && s.id !== dismissedAppointmentId);
      setAppointmentAlert(match ?? null);
    };

    evaluateAlert();
    const interval = setInterval(evaluateAlert, 60_000);
    return () => clearInterval(interval);
  }, [services, isTramitacion, dismissedAppointmentId]);

  // Filtrado de servicios - mismo para todos los usuarios (como Gestor Operativa)
  const filteredServices = useMemo<Service[]>(() => {
    console.log('Services - Total services before filtering:', services.length);
    
    let servicesWithAllowedStates = services;

    if (isTramitacion) {
      // Para tramitación: no aplicar el filtro estándar; usar condiciones específicas
      const estadosPermitidos = [
        'Formulario completado',
        'Llamado',
        'Pendiente de asignar',
        'Pendiente presupuesto',
        'Citado',
        'Material enviado',
        'Cancelado',
        'Finalizado',
      ];
      servicesWithAllowedStates = servicesWithAllowedStates.filter((s) => {
        const estadoOk = s.estado && estadosPermitidos.includes(s.estado);
        const tramitadoOk = !s.tramitado;
        return !!estadoOk && tramitadoOk;
      });
    } else {
      // Para servicios: mostrar todo salvo Finalizado/Cancelado
      servicesWithAllowedStates = services.filter((service) => {
        if (!service.estado) return true;
        const estadoLower = service.estado.toLowerCase();
        return estadoLower !== 'finalizado' && estadoLower !== 'cancelado';
      });
    }
    
    console.log('Services - After estado filter:', servicesWithAllowedStates.length);
    console.log('Services - Filtered out services by estado rules:', services.length - servicesWithAllowedStates.length);
    
    // Ver estados de los primeros servicios rechazados
    const rejectedServices = services.filter(service =>
      !service.estado || ['finalizado', 'cancelado'].includes(service.estado.toLowerCase())
    ).slice(0, 10);
    console.log('Services - Sample rejected services (first 10):', rejectedServices.map(s => ({
      expediente: s.expediente,
      estado: s.estado || 'SIN ESTADO',
      nombre: s.nombre
    })));

    // Aplicar filtro por tab solo para Técnico en Servicios
    if (!isTramitacion && isTecnico) {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Si el puesto es Técnico, excluir completamente ciertos estados de ambas pestañas
      if (user?.role === 'Técnico') {
        const estadosExcluidosTecnico = [
          'Pendiente de material',
          'Pendiente técnico',
          'Pendiente de técnico',
          'Pendiente presupuesto',
          'Pendiente de presupuesto',
          'Pendiente de asignar',
          'Pendiente de aceptación',
          'Aceptado',
        ];
        servicesWithAllowedStates = servicesWithAllowedStates.filter(
          (s) => !(s.estado && estadosExcluidosTecnico.includes(s.estado))
        );
        // Además, excluir "Citado" si tiene "Cita técnico" rellena
        servicesWithAllowedStates = servicesWithAllowedStates.filter(
          (s) => !(s.estado === 'Citado' && !!s.citaTecnico)
        );
      }

      servicesWithAllowedStates = servicesWithAllowedStates.filter(service => {
        const estado = service.estado;
        const cita = service.cita ? new Date(service.cita) : null;
        const citaTecnico = service.citaTecnico ? new Date(service.citaTecnico) : null;
        const ultimoCambio = service.ultimoCambio ? new Date(service.ultimoCambio) : null;
        const estadoEnvio = service.estadoEnvio;
        
        // Determinar tipo de cita según estado y campos
        const isCitaInterna = estado === 'Citado' && cita;
        const isCitaTecnico = estado === 'Citado' && citaTecnico;
        
        // Verificar si último cambio fue hace más de 24 horas
        const isUltimoCambioOld = ultimoCambio && ultimoCambio < twentyFourHoursAgo;
        const isUltimoCambioRecent = ultimoCambio && ultimoCambio >= twentyFourHoursAgo;
        
        if (activeTab === 'requiere-accion') {
          // Estados activos que siempre requieren acción
          const estadosActivos = ['Sin contactar', 'Llamado', 'Pendiente de presupuesto', 'Pendiente de asignar', 'Formulario completado', 'Pendiente técnico', 'Pendiente de material'];
          if (estado && estadosActivos.includes(estado)) return true;

          // Contactado: solo si último cambio > 24 horas
          if (estado === 'Contactado' && isUltimoCambioOld) return true;
          
          // Pendiente de aceptación: solo si último cambio > 24 horas
          if (estado === 'Pendiente de aceptación' && isUltimoCambioOld) return true;
          
          // Aceptado: solo si último cambio > 24 horas
          if (estado === 'Aceptado' && isUltimoCambioOld) return true;
          
          // Material enviado: solo si Estado envío es "Entregado"
          if (estado === 'Material enviado' && estadoEnvio === 'Entregado') return true;
          
          // Cita interna: HOY o ANTERIOR
          if (isCitaInterna && cita) {
            cita.setHours(0, 0, 0, 0);
            if (cita <= today) return true;
          }
          
          // Cita técnico: ANTERIOR a hoy (reclamar informe)
          if (isCitaTecnico && citaTecnico) {
            citaTecnico.setHours(0, 0, 0, 0);
            if (citaTecnico < today) return true;
          }
          
          return false;
        }
        
        if (activeTab === 'en-espera') {
          // Pendiente de aceptación: solo si último cambio < 24 horas
          if (estado === 'Pendiente de aceptación' && isUltimoCambioRecent) return true;
          
          // Aceptado: solo si último cambio < 24 horas
          if (estado === 'Aceptado' && isUltimoCambioRecent) return true;

          // Contactado: solo si último cambio < 24 horas
          if (estado === 'Contactado' && isUltimoCambioRecent) return true;
          
          // Material enviado: si NO es estado "Entregado"
          if (estado === 'Material enviado' && estadoEnvio !== 'Entregado') return true;
          
          // Cita interna: FUTURA
          if (isCitaInterna && cita) {
            cita.setHours(0, 0, 0, 0);
            if (cita > today) return true;
          }
          
          // Cita técnico: HOY o FUTURA
          if (isCitaTecnico && citaTecnico) {
            citaTecnico.setHours(0, 0, 0, 0);
            if (citaTecnico >= today) return true;
          }
          
          return false;
        }
        
        return false;
      });
      console.log('Services - After tab filter:', servicesWithAllowedStates.length);
    }

    const term = searchTerm.trim().toLowerCase();
    const filtered = term ? servicesWithAllowedStates.filter((service) => {
      const matchesExpediente = service.expediente?.toLowerCase().includes(term);
      const matchesNombre = service.nombre?.toLowerCase().includes(term);
      const matchesTelefono = service.telefono?.toLowerCase().includes(term);
      const matchesDireccion = service.direccion?.toLowerCase().includes(term);
      const matchesEstado = service.estado?.toLowerCase().includes(term);
      const matchesEstadoIpas = service.estadoIpas?.toLowerCase().includes(term);
      const matchesReferencia = service.referencia?.toLowerCase().includes(term);

      return (
        matchesExpediente ||
        matchesNombre ||
        matchesTelefono ||
        matchesDireccion ||
        matchesEstado ||
        matchesEstadoIpas ||
        matchesReferencia
      );
    }) : servicesWithAllowedStates;

    if (term) {
      console.log('Services - After search term filter:', filtered.length);
    }

    // Ordenar por fecha de registro, del más antiguo al más reciente
    const finalFiltered = filtered.sort((a, b) => {
      const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return dateA - dateB; // Orden ascendente (más antiguo primero)
    });

    console.log('Services - Final filtered services:', finalFiltered.length);
    return finalFiltered;
  }, [services, searchTerm, activeTab, isTramitacion, isTecnico]);

  const handleCloseModal = () => setSelectedService(null);
  const markSelected = (serviceId?: string) => {
    if (serviceId) setLastSelectedServiceId(serviceId);
  };

  // Cargar datos de formulario cuando se selecciona la vista en el modal de detalles
  useEffect(() => {
    const loadInlineForm = async () => {
      if (detailsView !== 'formulario') return;
      const expediente = selectedService?.expediente;
      if (!expediente) return;
      try {
        // Si los formularios actuales no pertenecen al expediente seleccionado, recargar
        const sameExp = formularios.length > 0 && (formularios[0]?.Expediente === expediente);
        if (!sameExp) {
          const data = await airtableService.getFormularioByExpediente(expediente);
          setFormularios(data);
          setSelectedFormularioIndex(0);
        }
      } catch (e) {
        console.error('Error cargando formularios (inline):', e);
      }
    };
    loadInlineForm();
  }, [detailsView, selectedService?.id]);

  // Cargar datos de reparaciones cuando se selecciona la vista en el modal de detalles
  useEffect(() => {
    const loadInlineRep = async () => {
      if (detailsView !== 'reparaciones') return;
      const expediente = selectedService?.expediente;
      if (!expediente) return;
      try {
        const sameExp = reparaciones.length > 0 && (reparaciones[0]?.expediente === expediente);
        if (!sameExp) {
          const data = await airtableService.getReparacionesByExpediente(expediente);
          setReparaciones(data);
          setSelectedReparacionIndex(0);
        }
      } catch (e) {
        console.error('Error cargando reparaciones (inline):', e);
      }
    };
    loadInlineRep();
  }, [detailsView, selectedService?.id]);

  // Al cerrar modales, asegurar scroll hacia el servicio seleccionado
  useEffect(() => {
    if (!selectedService && !selectedFormulario && !selectedReparacion && lastSelectedServiceId) {
      const el = document.getElementById(`service-row-${lastSelectedServiceId}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [selectedService, selectedFormulario, selectedReparacion, lastSelectedServiceId]);

  const handleMarkSynced = async (id: string) => {
    if (!isTramitacion) return;
    if (updatingId) return;
    setUpdatingId(id);
    try {
      await airtableService.setTramitacionTramitado(id, true);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err?.message || 'No se pudo marcar como tramitado');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEdit = (serviceId: string, field: string, currentValue: string) => {
    setEditingField({ id: serviceId, field });
    setEditValue(currentValue || '');
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

  const handlePhotoUpload = async (_formId: string, photoField: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    setUploadingPhoto(photoField);

    try {
      // Convertir archivo a base64 para enviarlo a Airtable
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Airtable requiere que se suba el archivo primero a un servidor público
          // y luego usar la URL. Por simplicidad, vamos a usar el mismo approach
          // que Airtable recomienda: subir a través de su API con URL públicas.
          // En este caso, deberías implementar tu propio servicio de subida de archivos
          // o usar un servicio como Cloudinary, AWS S3, etc.
          
          alert('Para subir fotos, necesitas implementar un servicio de almacenamiento de archivos (ej: Cloudinary, AWS S3). Por ahora, puedes usar la funcionalidad de descarga de fotos existentes.');
          
        } catch (error) {
          console.error('Error uploading photo:', error);
          alert('Error al subir la foto');
        } finally {
          setUploadingPhoto(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo');
      setUploadingPhoto(null);
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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      // Parsear la fecha manteniendo la hora exacta sin conversión de zona horaria
      let date: Date;
      if (dateString.includes('T')) {
        // Si ya tiene formato ISO, extraer componentes directamente para evitar conversión
        const [datePart, timePart] = dateString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        date = new Date(year, month - 1, day, hours, minutes);
      } else {
        date = new Date(dateString);
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  };

  const formatDateTimeForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      // Si ya está en formato ISO, extraer directamente sin conversión de zona horaria
      if (dateString.includes('T')) {
        return dateString.substring(0, 16); // YYYY-MM-DDTHH:MM
      }
      // Si es una fecha sin hora, usar el formato directo
      const date = new Date(dateString);
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
        <p className="ml-4 text-gray-600">Cargando {isTramitacion ? 'tramitaciones' : 'servicios'}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error al cargar {isTramitacion ? 'tramitaciones' : 'servicios'}</h3>
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
          <h1 className="text-3xl font-bold text-gray-900">{isTramitacion ? 'Tramitaciones' : 'Servicios'}</h1>
          <p className="text-gray-600 mt-2">{isTramitacion ? 'Consulta y gestiona las tramitaciones pendientes de sincronizar.' : 'Consulta y gestiona los servicios activos de punto de recarga.'}</p>
        </div>
        {!isTramitacion && appointmentAlert && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96">
            <div className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4 shadow-lg">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm font-semibold">Tienes una cita con el cliente {appointmentAlert.nombre || 'sin nombre'} ahora.</p>
                  <p className="text-xs text-green-800 mt-1">Recuerda llamarle.</p>
                </div>
                <button
                  aria-label="Cerrar aviso de cita"
                  className="text-green-700 hover:text-green-900"
                  onClick={() => {
                    setDismissedAppointmentId(appointmentAlert.id);
                    setAppointmentAlert(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={
                isTramitacion
                  ? 'Buscar por expediente, nombre, teléfono, dirección o estado...'
                  : 'Buscar por expediente, nombre, teléfono, dirección, estado o estado Ipas...'
              }
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {!isTramitacion && isTecnico && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('requiere-accion')}
              className={`flex-1 px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === 'requiere-accion'
                  ? 'bg-brand-primary text-white border-b-2 border-brand-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-brand-primary'
              }`}
            >
              Requiere Acción
            </button>
            <button
              onClick={() => setActiveTab('en-espera')}
              className={`flex-1 px-6 py-2 text-sm font-medium transition-colors ${
                activeTab === 'en-espera'
                  ? 'bg-brand-primary text-white border-b-2 border-brand-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-brand-primary'
              }`}
            >
              En Espera
            </button>
          </div>
        </div>
      )}

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{isTramitacion ? 'Estado' : 'Teléfono'}</th>
                  {!isTramitacion && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{isTramitacion ? 'Tramitado' : 'Último Cambio'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    id={`service-row-${service.id}`}
                    className={`${lastSelectedServiceId === service.id ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{service.expediente || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.fechaRegistro)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-40"><div className="max-w-[10rem] truncate">{service.nombre || '-'}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {isTramitacion ? (service.estado || '-') : (service.telefono || '-')}
                    </td>
                    {!isTramitacion && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={service.estado || ''}
                          onChange={async (e) => {
                            const newValue = e.target.value;
                            if (!newValue || newValue === service.estado) return;
                            
                            setSaving(true);
                            try {
                              await airtableService.updateServiceStatus(service.id, newValue);
                              const updatedServices = services.map((s) =>
                                s.id === service.id ? { ...s, estado: newValue } : s
                              );
                              setServices(updatedServices);
                            } catch (error) {
                              console.error('Error updating estado:', error);
                              alert('Error al actualizar el estado');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className={`py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getEstadoColor(service.estado)}`}
                          style={{ 
                            appearance: 'none', 
                            backgroundImage: 'none',
                            width: `${(service.estado || 'Sin estado').length + 4}ch`,
                            paddingLeft: '0.75rem',
                            paddingRight: '0.75rem'
                          }}
                        >
                          <option value="">Seleccionar...</option>
                          {STATUS_OPTIONS.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    {isTramitacion ? (
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleMarkSynced(service.id)}
                          disabled={updatingId === service.id}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Marcar como tramitado"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </td>
                    ) : (
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.ultimoCambio)}</td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setDetailsView('detalles');
                            markSelected(service.id);
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {/* Botón de chat */}
                        {service.conversationId && (
                          <a
                            href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${service.conversationId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                            title="Abrir chat"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl bg-gray-50 rounded-2xl shadow-lg border border-gray-200 my-8 mx-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
              aria-label="Cerrar detalles"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Tabs para cambiar la vista dentro del modal */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 pt-6 px-6">
                <button
                  className={`px-3 py-1.5 text-sm rounded-md ${detailsView === 'detalles' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setDetailsView('detalles')}
                >
                  Detalles
                </button>
                <button
                  className={`px-3 py-1.5 text-sm rounded-md ${detailsView === 'formulario' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setDetailsView('formulario')}
                >
                  Formulario
                </button>
                {!isGestoraTecnica && (
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md ${detailsView === 'reparaciones' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setDetailsView('reparaciones')}
                  >
                    Reparaciones
                  </button>
                )}
              </div>
            
            <div className="p-6 space-y-6 bg-white rounded-b-2xl">
              {detailsView === 'detalles' && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Detalle del servicio</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Expediente {selectedService.expediente || 'sin expediente asignado'}
                  </p>
                </div>
              )}

              {detailsView === 'detalles' && (
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
                  <p className="text-xs uppercase text-gray-500">Código postal</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.codigoPostal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Provincia</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.provincia)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Población</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.poblacion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                  <select
                    value={selectedService.estado || ''}
                    onChange={async (e) => {
                      const newValue = e.target.value;
                      if (!newValue || newValue === selectedService.estado) return;
                      setSaving(true);
                      try {
                        await airtableService.updateServiceStatus(selectedService.id, newValue);
                        const updatedServices = services.map((s) =>
                          s.id === selectedService.id ? { ...s, estado: newValue } : s
                        );
                        setServices(updatedServices);
                        setSelectedService({...selectedService, estado: newValue});
                      } catch (error) {
                        console.error('Error updating estado:', error);
                        alert('Error al actualizar el estado');
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className={`py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 w-full ${getEstadoColor(selectedService.estado)}`}
                    style={{ 
                      appearance: 'none', 
                      backgroundImage: 'none',
                      paddingLeft: '0.75rem',
                      paddingRight: '0.75rem'
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {STATUS_OPTIONS.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Último cambio</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.ultimoCambio))}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Estado envío</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.estadoEnvio)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha instalación</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.fechaInstalacion))}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Referencia</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.referencia)}</p>
                </div>
              </div>
              )}
              
              {detailsView === 'detalles' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">Descripción</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.descripcion)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">Comentarios</p>
                    <textarea
                      defaultValue={selectedService.comentarios || ''}
                      onBlur={async (e) => {
                        const newValue = e.target.value;
                        if (newValue === selectedService.comentarios) return;
                        setSaving(true);
                        try {
                          await airtableService.updateServiceComments(selectedService.id, newValue);
                          setServices(services.map(s => s.id === selectedService.id ? {...s, comentarios: newValue} : s));
                          setSelectedService({...selectedService, comentarios: newValue});
                        } catch (error) {
                          console.error('Error:', error);
                          alert('Error al guardar');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                      rows={3}
                      disabled={saving}
                      placeholder="Escribe comentarios..."
                    />
                  </div>
                  {/* Motivo cancelación - oculto para Gestora Operativa */}
                  {!isGestoraOperativa && (
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Motivo cancelación</p>
                      <select
                        value={selectedService.motivoCancelacion || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          if (newValue === selectedService.motivoCancelacion) return;
                          setSaving(true);
                          try {
                            await airtableService.updateServiceField(selectedService.id, 'Motivo cancelación', newValue);
                            setServices(services.map(s => s.id === selectedService.id ? {...s, motivoCancelacion: newValue} : s));
                            setSelectedService({...selectedService, motivoCancelacion: newValue});
                          } catch (error) {
                            console.error('Error:', error);
                            alert('Error al guardar');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm cursor-pointer"
                      >
                        <option value="">Sin especificar</option>
                        <option value="Ilocalizable">Ilocalizable</option>
                        <option value="Resuelto por el cliente">Resuelto por el cliente</option>
                        <option value="Sin cobertura">Sin cobertura</option>
                        <option value="Sin llave del cuadro">Sin llave del cuadro</option>
                      </select>
                    </div>
                  )}
                  {/* Primera fila: Cita y Cita técnico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cita - editable */}
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Cita</p>
                      <input
                        type="datetime-local"
                        defaultValue={formatDateTimeForInput(selectedService.cita)}
                        onBlur={async (e) => {
                          const newValue = e.target.value;
                          if (newValue === formatDateTimeForInput(selectedService.cita)) return;
                          if (!newValue) return;
                          setSaving(true);
                          try {
                            // Convertir YYYY-MM-DDTHH:MM a ISO manteniendo la hora exacta seleccionada
                            // Agregamos ':00' para segundos y guardamos sin zona horaria
                            const isoString = newValue + ':00';
                            await airtableService.updateServiceField(selectedService.id, 'Cita', isoString);
                            setServices(services.map(s => s.id === selectedService.id ? {...s, cita: isoString} : s));
                            setSelectedService({...selectedService, cita: isoString});
                          } catch (error) {
                            console.error('Error:', error);
                            alert('Error al guardar');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        disabled={saving}
                      />
                    </div>
                    {/* Cita técnico - siempre visible, solo lectura */}
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Cita técnico</p>
                      <p className="mt-1 text-sm text-gray-900">{renderDetailValue(formatDateTime(selectedService.citaTecnico))}</p>
                    </div>
                  </div>

                  {/* Segunda fila: Técnico y Nota técnico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Técnico</p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedService.trabajadorId && selectedService.trabajadorId.length > 0
                          ? tecnicos.find(t => t.id === selectedService.trabajadorId?.[0])?.nombre || 'Sin información'
                          : 'Sin información'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Nota técnico</p>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.notaTecnico)}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailsView === 'formulario' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Formulario</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Expediente {selectedService.expediente || 'sin expediente asignado'}
                      </p>
                    </div>
                    {formularios.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 uppercase">Seleccionar formulario:</label>
                        <select
                          value={selectedFormularioIndex}
                          onChange={(e) => setSelectedFormularioIndex(parseInt(e.target.value))}
                          className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                        >
                          {formularios.map((_, index) => (
                            <option key={index} value={index}>Formulario {index + 1}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Detalles */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Detalles</h3>
                        {formularios[selectedFormularioIndex]?.id && (
                          <button
                            onClick={() => {
                              const form = formularios[selectedFormularioIndex];
                              handleEdit(form.id, 'detalles', form.Detalles || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && formularios[selectedFormularioIndex]?.id === editingField.id && editingField.field === 'detalles' ? (
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
                              onClick={() => handleSaveFormulario(formularios[selectedFormularioIndex].id, 'Detalles')}
                              disabled={saving}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(formularios[selectedFormularioIndex]?.Detalles)}</p>
                      )}
                    </div>

                    {/* Potencia contratada */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Potencia contratada</h3>
                        {formularios[selectedFormularioIndex]?.id && (
                          <button
                            onClick={() => {
                              const form = formularios[selectedFormularioIndex];
                              handleEdit(form.id, 'potenciaContratada', form['Potencia contratada'] || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && formularios[selectedFormularioIndex]?.id === editingField.id && editingField.field === 'potenciaContratada' ? (
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
                            <button onClick={() => handleSaveFormulario(formularios[selectedFormularioIndex].id, 'Potencia contratada')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(formularios[selectedFormularioIndex]?.['Potencia contratada'])}</p>
                      )}
                    </div>

                    {/* Fecha instalación */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Fecha instalación</h3>
                        {formularios[selectedFormularioIndex]?.id && (
                          <button
                            onClick={() => {
                              const form = formularios[selectedFormularioIndex];
                              handleEdit(form.id, 'fechaInstalacion', form['Fecha instalación'] || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && formularios[selectedFormularioIndex]?.id === editingField.id && editingField.field === 'fechaInstalacion' ? (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                            disabled={saving}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveFormulario(formularios[selectedFormularioIndex].id, 'Fecha instalación')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(formularios[selectedFormularioIndex]?.['Fecha instalación'])}</p>
                      )}
                    </div>

                    {/* Archivos adjuntos */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Archivos adjuntos</h3>
                      <div className="space-y-2">
                        {formularios[selectedFormularioIndex]?.['Archivo 1'] && Array.isArray(formularios[selectedFormularioIndex]['Archivo 1']) && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Archivo 1:</span>
                            {formularios[selectedFormularioIndex]['Archivo 1'].map((file: AirtableAttachment, idx: number) => (
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
                        {formularios[selectedFormularioIndex]?.['Archivo 2'] && Array.isArray(formularios[selectedFormularioIndex]['Archivo 2']) && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Archivo 2:</span>
                            {formularios[selectedFormularioIndex]['Archivo 2'].map((file: AirtableAttachment, idx: number) => (
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
                        {formularios[selectedFormularioIndex]?.['Archivo 3'] && Array.isArray(formularios[selectedFormularioIndex]['Archivo 3']) && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Archivo 3:</span>
                            {formularios[selectedFormularioIndex]['Archivo 3'].map((file: AirtableAttachment, idx: number) => (
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Foto general */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">Foto general</h4>
                            {formularios[selectedFormularioIndex]?.id && (
                              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(formularios[selectedFormularioIndex].id, 'fotoGeneral', e)}
                                  disabled={uploadingPhoto !== null}
                                />
                                {uploadingPhoto === 'fotoGeneral' ? 'Subiendo...' : 'Adjuntar'}
                              </label>
                            )}
                          </div>
                          {formularios[selectedFormularioIndex]?.['Foto general'] && Array.isArray(formularios[selectedFormularioIndex]['Foto general']) && formularios[selectedFormularioIndex]['Foto general'].length > 0 ? (
                            <div className="space-y-2">
                              {formularios[selectedFormularioIndex]['Foto general'].map((file: AirtableAttachment, idx: number) => (
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">Foto etiqueta</h4>
                            {formularios[selectedFormularioIndex]?.id && (
                              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(formularios[selectedFormularioIndex].id, 'fotoEtiqueta', e)}
                                  disabled={uploadingPhoto !== null}
                                />
                                {uploadingPhoto === 'fotoEtiqueta' ? 'Subiendo...' : 'Adjuntar'}
                              </label>
                            )}
                          </div>
                          {formularios[selectedFormularioIndex]?.['Foto etiqueta'] && Array.isArray(formularios[selectedFormularioIndex]['Foto etiqueta']) && formularios[selectedFormularioIndex]['Foto etiqueta'].length > 0 ? (
                            <div className="space-y-2">
                              {formularios[selectedFormularioIndex]['Foto etiqueta'].map((file: AirtableAttachment, idx: number) => (
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">Foto roto</h4>
                            {formularios[selectedFormularioIndex]?.id && (
                              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(formularios[selectedFormularioIndex].id, 'fotoRoto', e)}
                                  disabled={uploadingPhoto !== null}
                                />
                                {uploadingPhoto === 'fotoRoto' ? 'Subiendo...' : 'Adjuntar'}
                              </label>
                            )}
                          </div>
                          {formularios[selectedFormularioIndex]?.['Foto roto'] && Array.isArray(formularios[selectedFormularioIndex]['Foto roto']) && formularios[selectedFormularioIndex]['Foto roto'].length > 0 ? (
                            <div className="space-y-2">
                              {formularios[selectedFormularioIndex]['Foto roto'].map((file: AirtableAttachment, idx: number) => (
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

                        {/* Foto cuadro */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">Foto cuadro</h4>
                            {formularios[selectedFormularioIndex]?.id && (
                              <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(formularios[selectedFormularioIndex].id, 'fotoCuadro', e)}
                                  disabled={uploadingPhoto !== null}
                                />
                                {uploadingPhoto === 'fotoCuadro' ? 'Subiendo...' : 'Adjuntar'}
                              </label>
                            )}
                          </div>
                          {formularios[selectedFormularioIndex]?.['Foto cuadro'] && Array.isArray(formularios[selectedFormularioIndex]['Foto cuadro']) && formularios[selectedFormularioIndex]['Foto cuadro'].length > 0 ? (
                            <div className="space-y-2">
                              {formularios[selectedFormularioIndex]['Foto cuadro'].map((file: AirtableAttachment, idx: number) => (
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
                                      alt="Foto cuadro"
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
              )}

              {detailsView === 'reparaciones' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Reparaciones</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Expediente {selectedService.expediente || 'sin expediente asignado'}
                      </p>
                    </div>
                    {reparaciones.length > 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 uppercase">Seleccionar reparación:</label>
                        <select
                          value={selectedReparacionIndex}
                          onChange={(e) => setSelectedReparacionIndex(parseInt(e.target.value))}
                          className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                        >
                          {reparaciones.map((_, index) => (
                            <option key={index} value={index}>Reparación {index + 1}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Técnico</h3>
                        {reparaciones[selectedReparacionIndex]?.id && (
                          <button
                            onClick={() => {
                              const rep = reparaciones[selectedReparacionIndex];
                              handleEdit(rep.id, 'tecnico-rep', rep.tecnico || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && reparaciones[selectedReparacionIndex]?.id === editingField.id && editingField.field === 'tecnico-rep' ? (
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
                            <button onClick={() => handleSaveReparacion(reparaciones[selectedReparacionIndex].id, 'Técnico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex]?.tecnico)}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Resultado</h3>
                        {reparaciones[selectedReparacionIndex]?.id && (
                          <button
                            onClick={() => {
                              const rep = reparaciones[selectedReparacionIndex];
                              handleEdit(rep.id, 'resultado', rep.resultado || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && reparaciones[selectedReparacionIndex]?.id === editingField.id && editingField.field === 'resultado' ? (
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
                            <button onClick={() => handleSaveReparacion(reparaciones[selectedReparacionIndex].id, 'Resultado')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex]?.resultado)}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Reparación</h3>
                        {reparaciones[selectedReparacionIndex]?.id && (
                          <button
                            onClick={() => {
                              const rep = reparaciones[selectedReparacionIndex];
                              handleEdit(rep.id, 'reparacion', rep.reparacion || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && reparaciones[selectedReparacionIndex]?.id === editingField.id && editingField.field === 'reparacion' ? (
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
                            <button onClick={() => handleSaveReparacion(reparaciones[selectedReparacionIndex].id, 'Reparación')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex]?.reparacion)}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-700">Cuadro eléctrico</h3>
                        {reparaciones[selectedReparacionIndex]?.id && (
                          <button
                            onClick={() => {
                              const rep = reparaciones[selectedReparacionIndex];
                              handleEdit(rep.id, 'cuadroElectrico', rep.cuadroElectrico || '');
                            }}
                            className="text-xs text-brand-primary hover:text-brand-green"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                      {editingField && reparaciones[selectedReparacionIndex]?.id === editingField.id && editingField.field === 'cuadroElectrico' ? (
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
                            <button onClick={() => handleSaveReparacion(reparaciones[selectedReparacionIndex].id, 'Cuadro eléctrico')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                              Guardar
                            </button>
                            <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex]?.cuadroElectrico)}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-700">Detalles</h3>
                      {reparaciones[selectedReparacionIndex]?.id && (
                        <button
                          onClick={() => {
                            const rep = reparaciones[selectedReparacionIndex];
                            handleEdit(rep.id, 'detalles-rep', rep.detalles || '');
                          }}
                          className="text-xs text-brand-primary hover:text-brand-green"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    {editingField && reparaciones[selectedReparacionIndex]?.id === editingField.id && editingField.field === 'detalles-rep' ? (
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
                          <button onClick={() => handleSaveReparacion(reparaciones[selectedReparacionIndex].id, 'Detalles')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                            Guardar
                          </button>
                          <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(reparaciones[selectedReparacionIndex]?.detalles)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
