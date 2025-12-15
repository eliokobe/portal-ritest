import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Search, Info, X, Check, XCircle, Eye, FileText, Wrench, Phone, Upload, MessageCircle } from 'lucide-react';
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
  sincronizado?: boolean;
  poblacion?: string;
  tramitado?: boolean;
  codigoPostal?: string;
  provincia?: string;
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
  'Pendiente técnico',
  'Pendiente de material',
  'Pendiente presupuesto',
  'Material enviado'
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

type ServicesVariant = 'servicios' | 'tramitaciones';

const Services: React.FC<{ variant?: ServicesVariant }> = ({ variant = 'servicios' }) => {
  const { user } = useAuth();
  const isTramitacion = variant === 'tramitaciones';
  const [services, setServices] = useState<Service[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'requiere-accion' | 'en-espera'>('requiere-accion');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [selectedFormularioIndex, setSelectedFormularioIndex] = useState(0);
  const [selectedFormulario, setSelectedFormulario] = useState<any | null>(null);
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [selectedReparacionIndex, setSelectedReparacionIndex] = useState(0);
  const [selectedReparacion, setSelectedReparacion] = useState<any | null>(null);
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [tecnicoSearchTerm, setTecnicoSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Determinar si el usuario es Gestora Operativa
  const isGestoraOperativa = user?.role === 'Gestora Operativa';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';

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
        setTecnicos(data);
      } catch (error) {
        console.error('Error loading técnicos:', error);
      }
    };

    loadTecnicos();
  }, []);

  // Filtrado de servicios - mismo para todos los usuarios (como Gestor Operativa)
  const filteredServices = useMemo<Service[]>(() => {
    console.log('Services - Total services before filtering:', services.length);
    
    let servicesWithAllowedStates = services;

    if (isTramitacion) {
      // Para tramitación: no aplicar el filtro estándar; usar condiciones específicas
      const estadosPermitidos = [
        'Formulario completado',
        'Llamado',
        'Pendiente Presupuesto',
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
      // Filtrar por estados permitidos para servicios
      servicesWithAllowedStates = services.filter(service =>
        service.estado && GESTORA_OPERATIVA_FILTROS.includes(service.estado)
      );
    }
    
    console.log('Services - After estado filter:', servicesWithAllowedStates.length);
    console.log('Services - Filtered out services without estado or not in allowed list:', services.length - servicesWithAllowedStates.length);
    
    // Ver estados de los primeros servicios rechazados
    const rejectedServices = services.filter(service =>
      !service.estado || !GESTORA_OPERATIVA_FILTROS.includes(service.estado)
    ).slice(0, 10);
    console.log('Services - Sample rejected services (first 10):', rejectedServices.map(s => ({
      expediente: s.expediente,
      estado: s.estado || 'SIN ESTADO',
      nombre: s.nombre
    })));

    // Aplicar filtro por tab (solo para Servicios, no Tramitaciones)
    if (!isTramitacion) {
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
  }, [services, searchTerm, activeTab, isTramitacion]);

  const handleCloseModal = () => setSelectedService(null);
  
  const handleOpenFormulario = async (expediente?: string) => {
    if (!expediente) {
      console.error('No se proporcionó expediente para buscar formulario');
      alert('No se puede abrir el formulario: expediente no disponible');
      return;
    }
    
    console.log('Abriendo formularios para expediente:', expediente);
    try {
      const data = await airtableService.getFormularioByExpediente(expediente);
      console.log('Formularios encontrados:', data);
      setFormularios(data);
      setSelectedFormularioIndex(0);
      setSelectedFormulario(data[0]);
    } catch (error) {
      console.error('Error fetching formularios:', error);
      alert(`Error al cargar el formulario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleOpenReparacion = async (expediente?: string) => {
    if (!expediente) {
      console.error('No se proporcionó expediente para buscar reparación');
      alert('No se puede abrir la reparación: expediente no disponible');
      return;
    }
    
    console.log('Abriendo reparaciones para expediente:', expediente);
    try {
      const data = await airtableService.getReparacionesByExpediente(expediente);
      console.log('Reparaciones encontradas:', data);
      setReparaciones(data);
      setSelectedReparacionIndex(0);
      setSelectedReparacion(data[0]);
    } catch (error) {
      console.error('Error fetching reparaciones:', error);
      alert(`Error al cargar la reparación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleCloseFormulario = () => {
    setSelectedFormulario(null);
    setFormularios([]);
    setSelectedFormularioIndex(0);
  };
  
  const handleCloseReparacion = () => {
    setSelectedReparacion(null);
    setReparaciones([]);
    setSelectedReparacionIndex(0);
  };

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

  const handlePhotoUpload = async (formId: string, photoField: string, event: React.ChangeEvent<HTMLInputElement>) => {
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
          const base64String = reader.result as string;
          
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
      const date = new Date(dateString);
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

      {!isTramitacion && (
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{isTramitacion ? 'Estado Ipas' : 'Estado'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{isTramitacion ? 'Tramitado' : 'Último Cambio'}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{service.expediente || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.fechaRegistro)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 w-40"><div className="max-w-[10rem] truncate">{service.nombre || '-'}</div></td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {isTramitacion ? (service.estado || '-') : (service.telefono || '-')}
                    </td>
                    <td className="px-4 py-3">
                      {isTramitacion ? (
                        <div className="text-sm text-gray-900 truncate">{service.estadoIpas || 'Sin estado'}</div>
                      ) : (
                        editingField?.id === service.id && editingField?.field === 'estado' ? (
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
                        )
                      )}
                    </td>
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
                          onClick={() => setSelectedService(service)}
                          className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
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
                            className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all"
                            title="Ver reparaciones"
                          >
                            <Wrench className="h-5 w-5" />
                          </button>
                        )}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto"
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

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-1">Descripción</p>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.descripcion)}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs uppercase text-gray-500">Comentarios</p>
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
                {/* Motivo cancelación - oculto para Gestora Operativa */}
                {!isGestoraOperativa && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs uppercase text-gray-500">Motivo cancelación</p>
                      <button
                        onClick={() => handleEdit(selectedService.id, 'motivoCancelacion', selectedService.motivoCancelacion || '')}
                        className="text-xs text-brand-primary hover:text-brand-green"
                      >
                        Editar
                      </button>
                    </div>
                    {editingField?.id === selectedService.id && editingField?.field === 'motivoCancelacion' ? (
                      <div className="space-y-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                        >
                          <option value="">Sin especificar</option>
                          <option value="Ilocalizable">Ilocalizable</option>
                          <option value="Resuelto por el cliente">Resuelto por el cliente</option>
                          <option value="Sin cobertura">Sin cobertura</option>
                          <option value="Sin llave del cuadro">Sin llave del cuadro</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(selectedService.id, 'motivoCancelacion')}
                            className="flex-1 px-3 py-1.5 bg-brand-primary text-white rounded-lg hover:bg-brand-green text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={handleCancel}
                            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedService.motivoCancelacion)}</p>
                    )}
                  </div>
                )}
                {/* Primera fila: Cita y Cita técnico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cita - editable */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs uppercase text-gray-500">Cita</p>
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
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(formatDateTime(selectedService.cita))}</p>
                    )}
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
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs uppercase text-gray-500">Técnico</p>
                      <button
                        onClick={() => {
                          const currentTecnicoId = selectedService.trabajadorId?.[0] || '';
                          handleEdit(selectedService.id, 'trabajadorId', currentTecnicoId);
                          setTecnicoSearchTerm('');
                        }}
                        className="text-xs text-brand-primary hover:text-brand-green"
                      >
                        Editar
                      </button>
                    </div>
                    {editingField?.id === selectedService.id && editingField?.field === 'trabajadorId' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Buscar técnico..."
                          value={tecnicoSearchTerm}
                          onChange={(e) => setTecnicoSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                          autoFocus
                        />
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                          disabled={saving}
                          size={5}
                        >
                          <option value="">Seleccionar técnico...</option>
                          {tecnicos
                            .filter((tecnico) =>
                              tecnico.nombre.toLowerCase().includes(tecnicoSearchTerm.toLowerCase())
                            )
                            .map((tecnico) => (
                              <option key={tecnico.id} value={tecnico.id}>
                                {tecnico.nombre}
                              </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              if (saving) return;
                              setSaving(true);
                              try {
                                await airtableService.updateServiceTecnico(selectedService.id, editValue);
                                setServices(prevServices =>
                                  prevServices.map(service =>
                                    service.id === selectedService.id
                                      ? { ...service, trabajadorId: editValue ? [editValue] : [] }
                                      : service
                                  )
                                );
                                if (selectedService?.id === selectedService.id) {
                                  setSelectedService(prev => prev ? { ...prev, trabajadorId: editValue ? [editValue] : [] } : null);
                                }
                                setEditingField(null);
                                setEditValue('');
                                setTecnicoSearchTerm('');
                              } catch (error) {
                                console.error('Error updating técnico:', error);
                                alert('Error al guardar los cambios');
                              } finally {
                                setSaving(false);
                              }
                            }} 
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
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedService.trabajadorId && selectedService.trabajadorId.length > 0
                          ? tecnicos.find(t => t.id === selectedService.trabajadorId?.[0])?.nombre || 'Sin información'
                          : 'Sin información'}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs uppercase text-gray-500">Nota técnico</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Formulario</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Expediente {selectedFormulario.Expediente || 'sin expediente asignado'}
                    </p>
                  </div>
                  {formularios.length > 1 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 uppercase">Seleccionar formulario:</label>
                      <select
                        value={selectedFormularioIndex}
                        onChange={(e) => {
                          const index = parseInt(e.target.value);
                          setSelectedFormularioIndex(index);
                          setSelectedFormulario(formularios[index]);
                        }}
                        className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                      >
                        {formularios.map((form, index) => (
                          <option key={index} value={index}>
                            Formulario {index + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Detalles */}
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

                {/* Potencia contratada */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Potencia contratada</h3>
                    <button
                      onClick={() => handleEdit(selectedFormulario.id, 'potenciaContratada', selectedFormulario['Potencia contratada'] || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedFormulario.id && editingField?.field === 'potenciaContratada' ? (
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
                        <button onClick={() => handleSaveFormulario(selectedFormulario.id, 'Potencia contratada')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedFormulario['Potencia contratada'])}</p>
                  )}
                </div>

                {/* Fecha instalación */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">Fecha instalación</h3>
                    <button
                      onClick={() => handleEdit(selectedFormulario.id, 'fechaInstalacion', selectedFormulario['Fecha instalación'] || '')}
                      className="text-xs text-brand-primary hover:text-brand-green"
                    >
                      Editar
                    </button>
                  </div>
                  {editingField?.id === selectedFormulario.id && editingField?.field === 'fechaInstalacion' ? (
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
                        <button onClick={() => handleSaveFormulario(selectedFormulario.id, 'Fecha instalación')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                          Guardar
                        </button>
                        <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(selectedFormulario['Fecha instalación'])}</p>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Foto general */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-600">Foto general</h4>
                        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(selectedFormulario.id, 'fotoGeneral', e)}
                            disabled={uploadingPhoto !== null}
                          />
                          {uploadingPhoto === 'fotoGeneral' ? 'Subiendo...' : 'Adjuntar'}
                        </label>
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-600">Foto etiqueta</h4>
                        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(selectedFormulario.id, 'fotoEtiqueta', e)}
                            disabled={uploadingPhoto !== null}
                          />
                          {uploadingPhoto === 'fotoEtiqueta' ? 'Subiendo...' : 'Adjuntar'}
                        </label>
                      </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-600">Foto roto</h4>
                        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(selectedFormulario.id, 'fotoRoto', e)}
                            disabled={uploadingPhoto !== null}
                          />
                          {uploadingPhoto === 'fotoRoto' ? 'Subiendo...' : 'Adjuntar'}
                        </label>
                      </div>
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

                    {/* Foto cuadro */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-600">Foto cuadro</h4>
                        <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(selectedFormulario.id, 'fotoCuadro', e)}
                            disabled={uploadingPhoto !== null}
                          />
                          {uploadingPhoto === 'fotoCuadro' ? 'Subiendo...' : 'Adjuntar'}
                        </label>
                      </div>
                      {selectedFormulario['Foto cuadro'] && Array.isArray(selectedFormulario['Foto cuadro']) && selectedFormulario['Foto cuadro'].length > 0 ? (
                        <div className="space-y-2">
                          {selectedFormulario['Foto cuadro'].map((file: AirtableAttachment, idx: number) => (
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Reparaciones</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Expediente {selectedReparacion.expediente || 'sin expediente asignado'}
                    </p>
                  </div>
                  {reparaciones.length > 1 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 uppercase">Seleccionar reparación:</label>
                      <select
                        value={selectedReparacionIndex}
                        onChange={(e) => {
                          const index = parseInt(e.target.value);
                          setSelectedReparacionIndex(index);
                          setSelectedReparacion(reparaciones[index]);
                        }}
                        className="px-3 py-1 border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary"
                      >
                        {reparaciones.map((rep, index) => (
                          <option key={index} value={index}>
                            Reparación {index + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
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
                  <h3 className="text-sm font-semibold text-gray-700">Detalles</h3>
                  <button
                    onClick={() => handleEdit(selectedReparacion.id, 'detalles-rep', selectedReparacion.detalles || '')}
                    className="text-xs text-brand-primary hover:text-brand-green"
                  >
                    Editar
                  </button>
                </div>
                {editingField?.id === selectedReparacion.id && editingField?.field === 'detalles-rep' ? (
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
                      <button onClick={() => handleSaveReparacion(selectedReparacion.id, 'Detalles')} disabled={saving} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                        Guardar
                      </button>
                      <button onClick={handleCancel} disabled={saving} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedReparacion.detalles)}</p>
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
