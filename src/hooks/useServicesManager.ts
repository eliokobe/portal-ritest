import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { airtableService } from '../services/airtable';
import { Service, User } from '../types';

interface UseServicesManagerOptions {
  user: User | null;
  isTramitacion: boolean;
}

export function useServicesManager({ user, isTramitacion }: UseServicesManagerOptions) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'requiere-accion' | 'en-espera'>('requiere-accion');
  const [appointmentAlert, setAppointmentAlert] = useState<Service | null>(null);
  const [dismissedAppointmentId, setDismissedAppointmentId] = useState<string | null>(null);

  const isTecnico = user?.role === 'Técnico';
  const isResponsableOrAdministrativa = user?.role === 'Responsable' || user?.role === 'Administrativa';

  const loadServices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const workerEmail = isTecnico ? user.email : undefined;
      const data = isTramitacion
        ? await airtableService.getTramitaciones(user.clinic, undefined, workerEmail, { onlyUnsynced: true })
        : await airtableService.getServices(user.clinic, undefined, workerEmail);
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los servicios');
    } finally {
      setLoading(false);
    }
  }, [user, isTramitacion, isTecnico]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Appointment alert logic
  useEffect(() => {
    if (isTramitacion) return;

    const isCitaNow = (service: Service) => {
      if (!service.cita || service.estado !== 'Citado') return false;
      const citaDate = new Date(service.cita);
      const now = new Date();
      if (isNaN(citaDate.getTime())) return false;
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

  const filteredServices = useMemo(() => {
    let result = services;

    // Phase 1: Filter by variant/role
    if (isTramitacion) {
      result = result.filter((s) => {
        const accionStr = String(s.accionIpartner || '');
        return !s.tramitado && accionStr.trim() !== '' && s.ipartner !== 'Cancelado' && s.ipartner !== 'Facturado';
      });
    } else if (!isResponsableOrAdministrativa) {
      result = result.filter((s) => {
        if (!s.estado) return true;
        const state = s.estado.toLowerCase();
        return state !== 'finalizado' && state !== 'cancelado' && state !== 'sin contactar';
      });
    }

    // Phase 2: Filter by technician tabs
    if (!isTramitacion && isTecnico && !isResponsableOrAdministrativa) {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      result = result.filter(s => {
        const citaDate = s.cita ? new Date(s.cita) : null;
        if (activeTab === 'requiere-accion') {
          if (s.estado === 'Citado' && citaDate) return citaDate <= now;
          return true;
        } else {
          if (s.estado === 'Citado' && citaDate) return citaDate > now;
          return false;
        }
      });
    }

    // Phase 3: Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(s => 
        String(s.numero || '').toLowerCase().includes(term) ||
        String(s.expediente || '').toLowerCase().includes(term) ||
        String(s.nombre || '').toLowerCase().includes(term) ||
        String(s.telefono || '').toLowerCase().includes(term) ||
        String(s.direccion || '').toLowerCase().includes(term) ||
        String(s.estado || '').toLowerCase().includes(term) ||
        String(s.ipartner || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [services, isTramitacion, isResponsableOrAdministrativa, isTecnico, activeTab, searchTerm]);

  return {
    services: filteredServices,
    allServices: services,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    appointmentAlert,
    setDismissedAppointmentId,
    refresh: loadServices,
    setServices
  };
}
