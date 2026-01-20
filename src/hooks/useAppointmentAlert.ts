import { useState, useEffect } from 'react';
import { Service } from '../types';

export const useAppointmentAlert = (services: Service[], isEnabled: boolean = true) => {
  const [appointmentAlert, setAppointmentAlert] = useState<Service | null>(null);
  const [dismissedAppointmentId, setDismissedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setAppointmentAlert(null);
      return;
    }

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
  }, [services, isEnabled, dismissedAppointmentId]);

  const dismissAlert = (id: string) => {
    setDismissedAppointmentId(id);
    setAppointmentAlert(null);
  };

  return {
    appointmentAlert,
    dismissAlert,
  };
};
