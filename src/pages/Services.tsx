import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Search, Info, X, XCircle, Phone, MessageCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import { getStatusColors, getIpartnerColors } from '../utils/statusColors';

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
  formularioId?: string[];
  reparacionesId?: string[];
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
  numeroSerie?: string;
  importe?: number;
  accionIpartner?: string;
  ipartner?: string;
  resolucionVisita?: string;
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

const IPARTNER_OPTIONS = [
  'Citado',
  'Cita confirmada',
  'Finalizado',
  'Cancelado',
  'Facturado'
];

const RESOLUCION_CANCELADO_OPTIONS = [
  'Ilocalizable',
  'Resuelto por el cliente',
  'No procede soporte',
  'Sin llave del cuadro',
  'Sin cobertura ya que supera los 3 años',
  'Interviene la empresa instaladora'
];

const RESOLUCION_FINALIZADO_OPTIONS = [
  'Liberación cuenta wallbox',
  'Reset y actualización',
  'Configuración del cargador'
];

const RESOLUCION_PRESUPUESTO_OPTIONS = [
  'Incidencia solucionada pero el cliente solicita un presupuesto adicional',
  'No procede soporte',
  'Sin cobertura ya que supera los 3 años'
];

const MOTIVO_TECNICO_OPTIONS = [
  'Borna quemada',
  'Diferencial monofásico averiado',
  'Diferencial trifásico averiado',
  'Sobretensiones monofásico averiado',
  'Sobretensiones trifásico averiado',
  'Cargador apagado',
  'Carga en espera',
  'Carga a menor potencia',
  'Salta la luz del contador',
  'No se conecta por Bluetooth',
  'No reconoce el GDP',
  'Otros'
];

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

type ServicesVariant = 'servicios' | 'tramitaciones';

interface ServicesProps {
  variant?: ServicesVariant;
  initialSelectedServiceId?: string;
  onClose?: () => void;
}

const Services: React.FC<ServicesProps> = ({ variant = 'servicios', initialSelectedServiceId, onClose }) => {
  const { user } = useAuth();
  const isTramitacion = variant === 'tramitaciones';
  const isTecnico = user?.role === 'Técnico';
  const [services, setServices] = useState<Service[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'requiere-accion' | 'en-espera'>('requiere-accion');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [detailsView, setDetailsView] = useState<'detalles' | 'formulario' | 'reparaciones' | 'fotos'>('detalles');
  const [formularios, setFormularios] = useState<any[]>([]);
  const [_fallbackFormulario, setFallbackFormulario] = useState<any | null>(null);
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
  const [showResolucionModal, setShowResolucionModal] = useState(false);
  const [pendingEstadoChange, setPendingEstadoChange] = useState<{serviceId: string, newEstado: string} | null>(null);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [showMotivoTecnicoModal, setShowMotivoTecnicoModal] = useState(false);

  // Determinar si el usuario es Gestora Técnica
  const isGestoraTecnica = user?.role === 'Gestora Técnica';
  const isResponsableOrAdministrativa = user?.role === 'Responsable' || user?.role === 'Administrativa';

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (selectedService || selectedFormulario || selectedReparacion) {
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
  }, [selectedService, selectedFormulario, selectedReparacion]);

  // Autoajustar textarea cuando se cambia a la vista de detalles
  useEffect(() => {
    if (detailsView === 'detalles' && selectedService) {
      setTimeout(() => {
        const textarea = document.querySelector('textarea[data-autosize="true"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }
      }, 0);
    }
  }, [detailsView, selectedService]);

  useEffect(() => {
    let isMounted = true;

    const loadServices = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`${isTramitacion ? 'Tramitaciones' : 'Services'} - Starting to load...`);
        console.log('User info:', { email: user?.email, role: user?.role, id: user?.id });
        
        // Si el usuario es Técnico, filtrar por email (campo "Email trabajador" en Airtable)
        // Para otros roles, no aplicar filtro por trabajador
        const workerId = undefined;
        const workerEmail = isTecnico ? user?.email : undefined;
        
        console.log('Filtering with:', { workerId, workerEmail, isTecnico });
        
        const data = isTramitacion
          ? await airtableService.getTramitaciones(user?.clinic, workerId, workerEmail, { onlyUnsynced: true })
          : await airtableService.getServices(user?.clinic, workerId, workerEmail);
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
  }, [user?.clinic, user?.id, user?.email, isTecnico]);

  // Auto-seleccionar servicio si se proporciona initialSelectedServiceId
  useEffect(() => {
    if (initialSelectedServiceId && services.length > 0 && !selectedService) {
      const service = services.find(s => s.id === initialSelectedServiceId);
      if (service) {
        setSelectedService(service);
        setDetailsView('detalles');
      }
    }
  }, [initialSelectedServiceId, services, selectedService]);

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

  // Gestiona el flujo completo de cambio de estado para que siempre abra los modales requeridos
  const handleEstadoSelection = (service: Service, newEstado: string) => {
    if (!newEstado || newEstado === service.estado) return;

    const oldEstado = service.estado;

    if (newEstado === 'Citado') {
      setPendingEstadoChange({ serviceId: service.id, newEstado });
      setShowCitaModal(true);
      return;
    }

    if (newEstado === 'Pendiente de asignar') {
      setPendingEstadoChange({ serviceId: service.id, newEstado });
      setShowMotivoTecnicoModal(true);
      return;
    }

    if (['Cancelado', 'Finalizado', 'Pendiente presupuesto'].includes(newEstado)) {
      setPendingEstadoChange({ serviceId: service.id, newEstado });
      setShowResolucionModal(true);
      return;
    }

    setSaving(true);
    airtableService.updateServiceStatus(service.id, newEstado)
      .then(() => {
        if (newEstado !== 'Citado') {
          return airtableService.updateServiceField(service.id, 'Cita', null);
        }
      })
      .then(() => {
        const updatedServices = services.map((s) =>
          s.id === service.id ? { ...s, estado: newEstado, cita: newEstado !== 'Citado' ? undefined : s.cita } : s
        );
        setServices(updatedServices);

        if (selectedService && selectedService.id === service.id) {
          setSelectedService({
            ...selectedService,
            estado: newEstado,
            cita: newEstado !== 'Citado' ? undefined : selectedService.cita
          });
        }
      })
      .catch((error) => {
        console.error('Error updating estado:', error);
        alert('Error al actualizar el estado');
        if (selectedService && selectedService.id === service.id) {
          setSelectedService({ ...selectedService, estado: oldEstado });
        }
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const pendingEstadoService = useMemo(
    () => (pendingEstadoChange ? services.find((s) => s.id === pendingEstadoChange.serviceId) || null : null),
    [pendingEstadoChange, services]
  );

  const hasFormularioPhotos = (form: any) => {
    if (!form) return false;
    const photoFields = ['Foto general', 'Foto etiqueta', 'Foto roto', 'Foto cuadro'];
    return photoFields.some((field) => Array.isArray(form[field]) && form[field].length > 0);
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
    const direccion = service?.direccion?.trim();
    const nombre = service?.nombre?.trim();

    const fallbackKey = expediente || direccion || nombre || 'sin-clave';

    setFormularios([]);
    setSelectedFormularioIndex(0);

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

    // Tercero: buscar por datos del cliente
    if (data.length === 0 && (expediente || direccion || nombre)) {
      try {
        data = await airtableService.getFormularioByClientInfo({ expediente, direccion, nombre });
      } catch (error) {
        console.error('Error buscando formularios por datos alternativos:', error);
      }
    }

    setFormularios(data);
    setSelectedFormularioIndex(0);
    // Solo cargar formulario de referencia en Tramitaciones
    if (isTramitacion) {
      await ensureFallbackFormulario(data, fallbackKey);
    } else {
      setFallbackFormulario(null);
    }
  };

  // Filtrado de servicios - mismo para todos los usuarios (como Gestor Operativa)
  const filteredServices = useMemo(() => {
    console.log('Services - Total services before filtering:', services.length);
    
    let servicesWithAllowedStates = services;

    // Si el usuario es Responsable o Administrativa, mostrar TODOS los servicios sin filtros SOLO en Servicios (no en Tramitaciones)
    if (isResponsableOrAdministrativa && !isTramitacion) {
      console.log('Services - Usuario es Responsable/Administrativa: mostrando todos los servicios sin filtros');
      servicesWithAllowedStates = services;
    } else if (isTramitacion) {
      // Para tramitación: filtrar según condiciones específicas (aplica a TODOS los usuarios)
      servicesWithAllowedStates = servicesWithAllowedStates.filter((s) => {
        // Condición 1: Registros pendientes de tramitar
        const isPendiente = !s.tramitado &&
          !!s.accionIpartner && s.accionIpartner.trim() !== '' &&
          s.ipartner !== 'Cancelado' && s.ipartner !== 'Facturado';
        
        // Condición 2: Estado = Finalizado, Ipartner no es Cancelado, Importe = 0
        const isFinalized = s.estado === 'Finalizado' && 
          s.ipartner !== 'Cancelado' &&
          (s.importe === 0 || s.importe === null || s.importe === undefined);
        
        return isPendiente || isFinalized;
      });
    } else {
      // Para servicios: mostrar todo salvo Finalizado/Cancelado/Sin contactar
      servicesWithAllowedStates = services.filter((service) => {
        if (!service.estado) return true;
        const estadoLower = service.estado.toLowerCase();
        return estadoLower !== 'finalizado' && estadoLower !== 'cancelado' && estadoLower !== 'sin contactar';
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

    // Aplicar filtro por tab solo para Técnico en Servicios (NO para Responsable/Administrativa)
    if (!isTramitacion && isTecnico && !isResponsableOrAdministrativa) {
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
          'Duplicado',
        ];
        servicesWithAllowedStates = servicesWithAllowedStates.filter(
          (s) => !(s.estado && estadosExcluidosTecnico.includes(s.estado))
        );
        // Además, excluir "Citado" si tiene "Cita técnico" rellena
        servicesWithAllowedStates = servicesWithAllowedStates.filter(
          (s) => !(s.estado === 'Citado' && !!s.citaTecnico)
        );
        // Excluir servicios que tienen la columna "Técnico" rellena
        servicesWithAllowedStates = servicesWithAllowedStates.filter(
          (s) => {
            if (!s.tecnico) return true;
            if (typeof s.tecnico === 'string') return s.tecnico.trim() === '';
            if (Array.isArray(s.tecnico)) return (s.tecnico as string[]).length === 0;
            return true;
          }
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
  }, [services, searchTerm, activeTab, isTramitacion, isTecnico, isResponsableOrAdministrativa]);

  const handleCloseModal = () => {
    setSelectedService(null);
    setFormularios([]);
    setFallbackFormulario(null);
    setSelectedFormularioIndex(0);
    setReparaciones([]);
    setSelectedReparacionIndex(0);
    if (onClose) {
      onClose();
    }
  };
  const markSelected = (serviceId?: string) => {
    if (serviceId) setLastSelectedServiceId(serviceId);
  };

  // Cargar datos de formulario cuando se selecciona la vista en el modal de detalles
  useEffect(() => {
    const loadInlineForm = async () => {
      const shouldLoad = (isTramitacion && (detailsView === 'detalles' || detailsView === 'fotos')) || (!isTramitacion && detailsView === 'formulario');
      if (!shouldLoad) return;

      await loadFormulariosForService(selectedService);
    };
    loadInlineForm();
  }, [detailsView, selectedService?.id, isTramitacion]);

  // Cargar datos de reparaciones cuando se selecciona la vista en el modal de detalles
  useEffect(() => {
    const loadInlineRep = async () => {
      // Cargar reparaciones para la vista de reparaciones o para la vista de fotos (en tramitaciones)
      if (detailsView !== 'reparaciones' && !(isTramitacion && detailsView === 'fotos')) return;
      if (!selectedService) {
        setReparaciones([]);
        setSelectedReparacionIndex(0);
        return;
      }
      
      const reparacionIds = selectedService.reparacionesId;
      const expediente = selectedService.expediente;
      
      try {
        let data: any[] = [];
        
        // Primero: intentar obtener por IDs de linked records
        if (reparacionIds && reparacionIds.length > 0) {
          console.log('Cargando reparaciones por linked records:', reparacionIds);
          data = await airtableService.getReparacionesByIds(reparacionIds);
        }
        
        // Segundo: buscar por expediente/número
        if (data.length === 0 && expediente) {
          data = await airtableService.getReparacionesByExpediente(expediente);
        }
        
        setReparaciones(data);
        setSelectedReparacionIndex(0);
      } catch (e) {
        console.error('Error cargando reparaciones (inline):', e);
        setReparaciones([]);
        setSelectedReparacionIndex(0);
      }
    };
    loadInlineRep();
  }, [detailsView, selectedService?.id, isTramitacion]);

  // Cargar formularios y reparaciones cuando se abre modal de tramitaciones
  useEffect(() => {
    if (!isTramitacion || !selectedService) return;

    const loadDatos = async () => {
      // PRIMERO: Cargar reparaciones
      let dataRep: any[] = [];
      try {
        // Intentar obtener por IDs de linked records
        if (selectedService.reparacionesId && selectedService.reparacionesId.length > 0) {
          console.log('Cargando reparaciones por linked records:', selectedService.reparacionesId);
          dataRep = await airtableService.getReparacionesByIds(selectedService.reparacionesId);
        }
        
        // Buscar por expediente/número
        if (dataRep.length === 0 && selectedService.expediente) {
          dataRep = await airtableService.getReparacionesByExpediente(selectedService.expediente);
        }
        
        setReparaciones(dataRep);
        setSelectedReparacionIndex(0);
      } catch (e) {
        console.error('Error cargando reparaciones para tramitaciones:', e);
        setReparaciones([]);
        dataRep = [];
      }

      // SEGUNDO: Cargar formularios (pasando información de reparaciones)
      try {
        const formularioIds = selectedService?.formularioId;
        const expediente = selectedService?.expediente?.trim();
        const direccion = selectedService?.direccion?.trim();
        const nombre = selectedService?.nombre?.trim();

        let dataForm: any[] = [];

        // Intentar obtener por IDs de linked records
        try {
          if (formularioIds && formularioIds.length > 0) {
            console.log('Cargando formularios por linked records:', formularioIds);
            dataForm = await airtableService.getFormulariosByIds(formularioIds);
          }
        } catch (error) {
          console.warn('No se pudieron cargar formularios por linked records', error);
        }

        // Buscar por expediente/número
        if (dataForm.length === 0 && expediente) {
          try {
            dataForm = await airtableService.getFormularioByExpediente(expediente);
          } catch (error) {
            console.warn('No se encontró formulario por expediente', error);
          }
        }

        // Buscar por datos del cliente
        if (dataForm.length === 0 && (expediente || direccion || nombre)) {
          try {
            dataForm = await airtableService.getFormularioByClientInfo({ expediente, direccion, nombre });
          } catch (error) {
            console.error('Error buscando formularios por datos alternativos:', error);
          }
        }

        // SOLO cargar formulario random si no hay formularios NI reparaciones
        if (dataForm.length === 0 && dataRep.length === 0) {
          try {
            console.log('No se encontraron formularios ni reparaciones, cargando formulario random con fotos...');
            const randomForm = await airtableService.getRandomFormularioWithPhotos();
            if (randomForm) {
              dataForm = [randomForm];
              console.log('Formulario random cargado:', randomForm.id);
            }
          } catch (error) {
            console.error('Error cargando formulario random:', error);
          }
        }

        setFormularios(dataForm);
        setSelectedFormularioIndex(0);
        
        const fallbackKey = expediente || direccion || nombre || 'sin-clave';
        await ensureFallbackFormulario(dataForm, fallbackKey);
      } catch (e) {
        console.error('Error cargando formularios para tramitaciones:', e);
        setFormularios([]);
      }
    };

    loadDatos();
  }, [selectedService?.id, isTramitacion]);

  // Al cerrar modales, asegurar scroll hacia el servicio seleccionado
  useEffect(() => {
    if (!selectedService && !selectedFormulario && !selectedReparacion && lastSelectedServiceId) {
      const el = document.getElementById(`service-row-${lastSelectedServiceId}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [selectedService, selectedFormulario, selectedReparacion, lastSelectedServiceId]);

  // Función para marcar como tramitado (no se usa actualmente pero se mantiene para futura funcionalidad)
  const _handleMarkSynced = async (id: string) => {
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

  // Función para manejar edición de campos
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
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const parseCitaInput = (input: string): Date | null => {
    // Parsear formato DD/MM/YYYY hh:mm
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
                  {isTramitacion ? (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ipartner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importe</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </>
                  )}
                  {!isTramitacion && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Cambio</th>}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
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
                    {isTramitacion ? (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={service.ipartner || ''}
                            onChange={async (e) => {
                              const newValue = e.target.value;
                              if (!newValue || newValue === service.ipartner) return;
                              
                              setSaving(true);
                              try {
                                await airtableService.updateServiceField(service.id, 'Ipartner', newValue);
                                const updatedServices = services.map((s) =>
                                  s.id === service.id ? { ...s, ipartner: newValue } : s
                                );
                                setServices(updatedServices);
                              } catch (error) {
                                console.error('Error updating ipartner:', error);
                                alert('Error al actualizar ipartner');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getIpartnerColors(service.ipartner).bg} ${getIpartnerColors(service.ipartner).text}`}
                            style={{ 
                              appearance: 'none', 
                              backgroundImage: 'none',
                              width: `${(service.ipartner || 'Seleccionar').length + 4}ch`,
                              paddingLeft: '0.75rem',
                              paddingRight: '0.75rem'
                            }}
                          >
                            <option value="">Seleccionar...</option>
                            {IPARTNER_OPTIONS.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={service.importe || ''}
                          onBlur={async (e) => {
                            const inputValue = e.target.value.trim();
                            
                            // Si está vacío, enviar null para limpiar el campo
                            if (inputValue === '') {
                              if (service.importe === undefined || service.importe === null) return;
                              setSaving(true);
                              try {
                                await airtableService.updateServiceField(service.id, 'Importe', null);
                                setServices(services.map(s => s.id === service.id ? {...s, importe: undefined} : s));
                              } catch (error: any) {
                                console.error('Error:', error);
                                alert('Error al guardar: ' + (error?.response?.data?.error?.message || error.message));
                              } finally {
                                setSaving(false);
                              }
                              return;
                            }
                            
                            const newValue = parseFloat(inputValue);
                            if (isNaN(newValue) || newValue === service.importe) return;
                            setSaving(true);
                            try {
                              await airtableService.updateServiceField(service.id, 'Importe', newValue);
                              setServices(services.map(s => s.id === service.id ? {...s, importe: newValue} : s));
                            } catch (error: any) {
                              console.error('Error:', error);
                              alert('Error al guardar: ' + (error?.response?.data?.error?.message || error.message));
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                          disabled={saving}
                          placeholder="0.00"
                        />
                      </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{service.telefono || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={service.estado || ''}
                          onChange={(e) => handleEstadoSelection(service, e.target.value)}
                          disabled={saving}
                          className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getStatusColors(service.estado).bg} ${getStatusColors(service.estado).text}`}
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
                      </>
                    )}
                    {!isTramitacion && (
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(service.ultimoCambio)}</td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedService(service);
                          setDetailsView('detalles');
                          markSelected(service.id);
                        }}
                        className="text-brand-primary hover:text-brand-primary/80 font-medium"
                      >
                        Ver detalles
                      </button>
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
            className="relative w-full max-w-4xl bg-gray-50 rounded-2xl shadow-lg border border-gray-200 my-4 mx-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              {selectedService.telefono && (
                <a
                  href={`tel:${selectedService.telefono}`}
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Llamar"
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
                onClick={handleCloseModal}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar detalles"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Tabs para cambiar la vista dentro del modal */}
            {!isTramitacion && (
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 pt-6 px-6 bg-gray-50 rounded-t-2xl">
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
            )}
            {/* Tabs para tramitaciones */}
            {isTramitacion && (
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2 pt-6 px-6 bg-gray-50 rounded-t-2xl">
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md ${detailsView === 'detalles' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setDetailsView('detalles')}
                  >
                    Detalles
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md ${detailsView === 'fotos' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setDetailsView('fotos')}
                  >
                    Fotos
                  </button>
                </div>
            )}
            
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
                  <p className="text-xs uppercase text-gray-500">Número de serie</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.numeroSerie)}</p>
                </div>
                {!isTramitacion && !isTecnico && (
                  <>
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
                  </>
                )}
                {!isTramitacion && (
                  <div className="flex flex-col">
                    <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                    <div>
                      <select
                        value={selectedService.estado || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          handleEstadoSelection(selectedService, newValue);
                        }}
                        disabled={saving}
                        className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 inline-block text-center ${getStatusColors(selectedService.estado).bg} ${getStatusColors(selectedService.estado).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          paddingLeft: '0.5rem',
                          paddingRight: '0.5rem',
                          minWidth: '120px'
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {STATUS_OPTIONS.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {isTramitacion && (
                  <div className="flex flex-col">
                    <p className="text-xs uppercase text-gray-500 mb-1">Ipartner</p>
                    <div>
                      <select
                        value={selectedService.ipartner || ''}
                        onChange={async (e) => {
                          const newValue = e.target.value;
                          if (!newValue || newValue === selectedService.ipartner) return;
                          setSaving(true);
                          try {
                            await airtableService.updateServiceField(selectedService.id, 'Ipartner', newValue);
                            const updatedServices = services.map(s => 
                              s.id === selectedService.id ? {...s, ipartner: newValue} : s
                            );
                            setServices(updatedServices);
                            setSelectedService({...selectedService, ipartner: newValue});
                          } catch (error) {
                            console.error('Error updating ipartner:', error);
                            alert('Error al actualizar Ipartner');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 inline-block text-center ${getIpartnerColors(selectedService.ipartner).bg} ${getIpartnerColors(selectedService.ipartner).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          paddingLeft: '0.5rem',
                          paddingRight: '0.5rem',
                          minWidth: '120px'
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {IPARTNER_OPTIONS.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {!isTramitacion && !isTecnico && (
                  <>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Último cambio</p>
                      <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.ultimoCambio))}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Estado envío</p>
                      <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.estadoEnvio)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Referencia</p>
                      <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.referencia)}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha instalación</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.fechaInstalacion))}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha de registro</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(formatDate(selectedService.fechaRegistro))}</p>
                </div>
              </div>
              )}

              {isTramitacion && detailsView === 'detalles' && (
                <div className="w-full">
                  <p className="text-xs uppercase text-gray-500">Acción Ipartner</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.accionIpartner)}</p>
                </div>
              )}
              
              {detailsView === 'detalles' && (
                <div className="space-y-4">
                  {!isTramitacion && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase text-gray-500 mb-1">Descripción</p>
                        <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(selectedService.descripcion)}</p>
                      </div>
                      {selectedService.estado === 'Citado' && (
                        <div>
                          <p className="text-xs uppercase text-gray-500 mb-1">Cita</p>
                          <input
                            type="text"
                            defaultValue={formatDateTimeForInput(selectedService.cita)}
                            onChange={formatCitaInputWithAutoFormat}
                            maxLength={16}
                            placeholder="DD/MM/YYYY hh:mm"
                            onBlur={async (e) => {
                              const newValue = e.target.value;
                              if (newValue === formatDateTimeForInput(selectedService.cita) || !newValue) return;
                              
                              const date = parseCitaInput(newValue);
                              if (!date) {
                                alert('Fecha y hora inválidas');
                                return;
                              }

                              setSaving(true);
                              try {
                                const isoString = date.toISOString();
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
                      )}
                    </div>
                  )}
                  {!isTramitacion && (
                    <div>
                      <p className="text-xs uppercase text-gray-500 mb-1">Comentarios</p>
                      {selectedService.comentarios && (
                        <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                          <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.comentarios}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <textarea
                          id={`new-comment-${selectedService.id}`}
                          placeholder="Escribe un nuevo comentario..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
                          rows={3}
                          disabled={saving}
                        />
                        <button
                          onClick={async () => {
                            const textarea = document.getElementById(`new-comment-${selectedService.id}`) as HTMLTextAreaElement;
                            const newComment = textarea?.value?.trim();
                            
                            if (!newComment) {
                              alert('Por favor escribe un comentario');
                              return;
                            }

                            setSaving(true);
                            try {
                              // Obtener fecha y hora actual en formato DD/MM/YYYY HH:MM
                              const now = new Date();
                              const day = String(now.getDate()).padStart(2, '0');
                              const month = String(now.getMonth() + 1).padStart(2, '0');
                              const year = now.getFullYear();
                              const hours = String(now.getHours()).padStart(2, '0');
                              const minutes = String(now.getMinutes()).padStart(2, '0');
                              const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                              
                              // Formatear el nuevo comentario con fecha y usuario
                              const userName = user?.name || 'Usuario';
                              const formattedComment = `${formattedDate} - ${userName}: ${newComment}`;
                              
                              // Concatenar con comentarios existentes
                              const updatedComments = selectedService.comentarios 
                                ? `${formattedComment}\n\n${selectedService.comentarios}`
                                : formattedComment;
                              
                              // Guardar en Airtable
                              await airtableService.updateServiceComments(selectedService.id, updatedComments);
                              
                              // Actualizar el estado local
                              setServices(services.map(s => 
                                s.id === selectedService.id ? {...s, comentarios: updatedComments} : s
                              ));
                              setSelectedService({...selectedService, comentarios: updatedComments});
                              
                              // Limpiar el textarea
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
                  )}
                  {/* Cita técnico y Técnico - oculto para técnicos */}
                  {!isTramitacion && !isTecnico && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cita técnico - solo lectura */}
                      <div>
                        <p className="text-xs uppercase text-gray-500 mb-1">Cita técnico</p>
                        <p className="mt-1 text-sm text-gray-900">{renderDetailValue(formatDateTime(selectedService.citaTecnico))}</p>
                      </div>
                    </div>
                  )}

                  {/* Segunda fila: Técnico y Nota técnico - oculto para técnicos */}
                  {!isTramitacion && !isTecnico && (
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
                  )}
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

                    {/* Fotos */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Fotos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Foto general */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-medium text-gray-600">Foto general</h4>
                            {formularios[selectedFormularioIndex]?.id && (
                              <label className="cursor-pointer text-xs bg-brand-primary text-white px-3 py-1 rounded hover:bg-brand-primary/80 transition-colors flex items-center gap-1">
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
                                  {file.thumbnails?.large?.url && (
                                    <img
                                      src={file.thumbnails.large.url}
                                      alt="Foto general"
                                      className="w-full h-auto object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(file.url, '_blank')}
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
                              <label className="cursor-pointer text-xs bg-brand-primary text-white px-3 py-1 rounded hover:bg-brand-primary/80 transition-colors flex items-center gap-1">
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
                                  {file.thumbnails?.large?.url && (
                                    <img
                                      src={file.thumbnails.large.url}
                                      alt="Foto etiqueta"
                                      className="w-full h-auto object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(file.url, '_blank')}
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
                              <label className="cursor-pointer text-xs bg-brand-primary text-white px-3 py-1 rounded hover:bg-brand-primary/80 transition-colors flex items-center gap-1">
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
                                  {file.thumbnails?.large?.url && (
                                    <img
                                      src={file.thumbnails.large.url}
                                      alt="Foto roto"
                                      className="w-full h-auto object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(file.url, '_blank')}
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
                              <label className="cursor-pointer text-xs bg-brand-primary text-white px-3 py-1 rounded hover:bg-brand-primary/80 transition-colors flex items-center gap-1">
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
                                  {file.thumbnails?.large?.url && (
                                    <img
                                      src={file.thumbnails.large.url}
                                      alt="Foto cuadro"
                                      className="w-full h-auto object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => window.open(file.url, '_blank')}
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

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Número de serie</h3>
                    <p className="mt-1 text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex]?.numeroSerie)}</p>
                  </div>
                </div>
              )}

              {/* Vista de Fotos - Solo para tramitaciones */}
              {detailsView === 'fotos' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Fotos</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Expediente {selectedService.expediente || 'sin expediente asignado'}
                    </p>
                  </div>

                  {(() => {
                    // Recolectar todas las fotos del formulario
                    const formulario = formularios.length > 0 ? formularios[0] : null;
                    const fotoGeneral = formulario?.['Foto general'];
                    const hasPhoto = Array.isArray(fotoGeneral) && fotoGeneral.length > 0;
                    
                    // Si hay formulario pero no tiene foto general, usar fallback
                    const displayFormulario = formulario && !hasPhoto ? _fallbackFormulario : formulario;
                    
                    const fotosFormularioGeneral = displayFormulario?.['Foto general'] && Array.isArray(displayFormulario['Foto general']) && displayFormulario['Foto general'].length > 0
                      ? displayFormulario['Foto general']
                      : [];
                    const fotosFormularioEtiqueta = displayFormulario?.['Foto etiqueta'] && Array.isArray(displayFormulario['Foto etiqueta']) && displayFormulario['Foto etiqueta'].length > 0
                      ? displayFormulario['Foto etiqueta']
                      : [];
                    const fotosFormularioRoto = displayFormulario?.['Foto roto'] && Array.isArray(displayFormulario['Foto roto']) && displayFormulario['Foto roto'].length > 0
                      ? displayFormulario['Foto roto']
                      : [];
                    const fotosFormularioCuadro = displayFormulario?.['Foto cuadro'] && Array.isArray(displayFormulario['Foto cuadro']) && displayFormulario['Foto cuadro'].length > 0
                      ? displayFormulario['Foto cuadro']
                      : [];

                    // Recolectar todas las fotos de las reparaciones
                    const fotosReparaciones: Array<{ foto: any; tipo: string; reparacionNum: number }> = [];
                    reparaciones.forEach((reparacion, idx) => {
                      // Foto principal de reparación
                      if (reparacion.Foto && Array.isArray(reparacion.Foto) && reparacion.Foto.length > 0) {
                        reparacion.Foto.forEach((foto: any) => {
                          fotosReparaciones.push({ foto, tipo: 'Foto reparación', reparacionNum: idx + 1 });
                        });
                      } else if (reparacion.foto && Array.isArray(reparacion.foto) && reparacion.foto.length > 0) {
                        reparacion.foto.forEach((foto: any) => {
                          fotosReparaciones.push({ foto, tipo: 'Foto reparación', reparacionNum: idx + 1 });
                        });
                      }
                      
                      // Foto de la etiqueta de reparación
                      if (reparacion['Foto de la etiqueta'] && Array.isArray(reparacion['Foto de la etiqueta']) && reparacion['Foto de la etiqueta'].length > 0) {
                        reparacion['Foto de la etiqueta'].forEach((foto: any) => {
                          fotosReparaciones.push({ foto, tipo: 'Foto etiqueta reparación', reparacionNum: idx + 1 });
                        });
                      } else if (reparacion.fotoEtiqueta && Array.isArray(reparacion.fotoEtiqueta) && reparacion.fotoEtiqueta.length > 0) {
                        reparacion.fotoEtiqueta.forEach((foto: any) => {
                          fotosReparaciones.push({ foto, tipo: 'Foto etiqueta reparación', reparacionNum: idx + 1 });
                        });
                      }
                    });

                    // Verificar si hay al menos una foto para mostrar
                    const hayFotos = fotosFormularioGeneral.length > 0 || 
                                     fotosFormularioEtiqueta.length > 0 || 
                                     fotosFormularioRoto.length > 0 || 
                                     fotosFormularioCuadro.length > 0 || 
                                     fotosReparaciones.length > 0;

                    return hayFotos ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Fotos del formulario - Foto general */}
                        {fotosFormularioGeneral.map((file: any, idx: number) => (
                          <div key={`form-general-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto general (Formulario)</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto general"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                        
                        {/* Fotos del formulario - Foto etiqueta */}
                        {fotosFormularioEtiqueta.map((file: any, idx: number) => (
                          <div key={`form-etiqueta-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto etiqueta (Formulario)</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto etiqueta"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                        
                        {/* Fotos del formulario - Foto roto */}
                        {fotosFormularioRoto.map((file: any, idx: number) => (
                          <div key={`form-roto-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto roto (Formulario)</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto roto"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                        
                        {/* Fotos del formulario - Foto cuadro */}
                        {fotosFormularioCuadro.map((file: any, idx: number) => (
                          <div key={`form-cuadro-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto cuadro (Formulario)</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto cuadro"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}

                        {/* Fotos de las reparaciones */}
                        {fotosReparaciones.map((item, idx) => (
                          <div key={`rep-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">{item.tipo} (Reparación {item.reparacionNum})</p>
                            {item.foto.thumbnails?.large?.url && (
                              <img
                                src={item.foto.thumbnails.large.url}
                                alt={item.tipo}
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(item.foto.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No hay fotos disponibles para este servicio</p>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar Resolución Visita */}
      {showResolucionModal && pendingEstadoChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setShowResolucionModal(false);
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
                setShowResolucionModal(false);
                setPendingEstadoChange(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Resolución de Visita</h2>

            <div className="space-y-3">
              {(pendingEstadoChange.newEstado === 'Cancelado' 
                ? RESOLUCION_CANCELADO_OPTIONS 
                : pendingEstadoChange.newEstado === 'Pendiente presupuesto'
                ? RESOLUCION_PRESUPUESTO_OPTIONS
                : RESOLUCION_FINALIZADO_OPTIONS).map((opcion) => (
                <button
                  key={opcion}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      // Actualizar el estado
                      await airtableService.updateServiceStatus(
                        pendingEstadoChange.serviceId,
                        pendingEstadoChange.newEstado
                      );
                      
                      // Actualizar la resolución visita
                      await airtableService.updateServiceField(
                        pendingEstadoChange.serviceId,
                        'Resolución visita',
                        opcion
                      );

                      // Limpiar la Cita cuando se cambia a Cancelado o Finalizado
                      await airtableService.updateServiceField(
                        pendingEstadoChange.serviceId,
                        'Cita',
                        null
                      );

                      // Actualizar el estado local
                      const updatedServices = services.map((s) =>
                        s.id === pendingEstadoChange.serviceId
                          ? { ...s, estado: pendingEstadoChange.newEstado, resolucionVisita: opcion, cita: undefined }
                          : s
                      );
                      setServices(updatedServices);

                      // Actualizar el servicio seleccionado
                      if (selectedService && selectedService.id === pendingEstadoChange.serviceId) {
                        setSelectedService({
                          ...selectedService,
                          estado: pendingEstadoChange.newEstado,
                          resolucionVisita: opcion,
                          cita: undefined
                        });
                      }

                      // Cerrar el modal
                      setShowResolucionModal(false);
                      setPendingEstadoChange(null);
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al guardar');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 font-medium"
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal para seleccionar Motivo Técnico */}
      {showMotivoTecnicoModal && pendingEstadoChange && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
          onClick={() => {
            setShowMotivoTecnicoModal(false);
            setPendingEstadoChange(null);
          }}
        >
          <div
            className="relative w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 my-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowMotivoTecnicoModal(false);
                setPendingEstadoChange(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Motivo Técnico</h2>

            <div className="grid grid-cols-2 gap-3">
              {MOTIVO_TECNICO_OPTIONS.map((opcion) => (
                <button
                  key={opcion}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      // Actualizar el estado
                      await airtableService.updateServiceStatus(
                        pendingEstadoChange.serviceId,
                        pendingEstadoChange.newEstado
                      );
                      
                      // Actualizar el motivo técnico
                      await airtableService.updateServiceField(
                        pendingEstadoChange.serviceId,
                        'Motivo técnico',
                        opcion
                      );

                      // Actualizar el estado local
                      const updatedServices = services.map((s) =>
                        s.id === pendingEstadoChange.serviceId
                          ? { ...s, estado: pendingEstadoChange.newEstado }
                          : s
                      );
                      setServices(updatedServices);

                      // Actualizar el servicio seleccionado
                      if (selectedService && selectedService.id === pendingEstadoChange.serviceId) {
                        setSelectedService({
                          ...selectedService,
                          estado: pendingEstadoChange.newEstado
                        });
                      }

                      // Cerrar el modal
                      setShowMotivoTecnicoModal(false);
                      setPendingEstadoChange(null);
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al guardar');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 font-medium"
                >
                  {opcion}
                </button>
              ))}
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
                  id="citaInput"
                  placeholder="DD/MM/YYYY hh:mm"
                  onChange={formatCitaInputWithAutoFormat}
                  defaultValue={formatDateTimeForInput(pendingEstadoService?.cita)}
                  maxLength={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const citaInput = document.getElementById('citaInput') as HTMLInputElement;
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
                      await airtableService.updateServiceStatus(
                        pendingEstadoChange.serviceId,
                        pendingEstadoChange.newEstado
                      );

                      // Actualizar la cita
                      await airtableService.updateServiceField(
                        pendingEstadoChange.serviceId,
                        'Cita',
                        isoString
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
      )}
    </div>
  );
};

export default Services;
