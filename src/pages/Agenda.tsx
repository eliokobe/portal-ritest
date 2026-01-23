import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import { Service } from '../types';
import { Modal } from '../components/common/Modal';
import { ServiceDetails } from '../components/features/ServiceDetails/ServiceDetails';
import { CitaModal } from '../components/features/ServiceDetails/CitaModal';
import { ResolucionModal } from '../components/features/ServiceDetails/ResolucionModal';
import { MotivoTecnicoModal } from '../components/features/ServiceDetails/MotivoTecnicoModal';
import { PresupuestoModal } from '../components/features/ServiceDetails/PresupuestoModal';

interface AppointmentSlot {
  time: string;
  service?: Service;
}

const Agenda: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estados para manejo de cambios de estado (copiados de Services.tsx para consistencia)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ serviceId: string; newStatus: string } | null>(null);
  const [modalToShow, setModalToShow] = useState<'cita' | 'resolucion' | 'motivo' | 'presupuesto' | null>(null);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Obtener servicios filtrando por el email del usuario
      const allServices = await airtableService.getServices(undefined, undefined, user.email);
      
      // Filtrar solo los que tienen cita, estado Citado y sin técnico asignado
      const withAppointments = allServices.filter(s => s.cita && s.estado === 'Citado' && !s.tecnico);
      
      setServices(withAppointments as Service[]);
    } catch (err) {
      setError('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSelect = (service: Service, newStatus: string) => {
    if (!newStatus || newStatus === service.estado) return;

    if (newStatus === 'Citado') {
      setPendingStatusChange({ serviceId: service.id, newStatus });
      setModalToShow('cita');
      return;
    }
      
    if (newStatus === 'Pendiente de asignar' || newStatus === 'Material enviado') {
      setPendingStatusChange({ serviceId: service.id, newStatus });
      setModalToShow('motivo');
      return;
    }

    if (['Cancelado', 'Finalizado'].includes(newStatus)) {
      setPendingStatusChange({ serviceId: service.id, newStatus });
      setModalToShow('resolucion');
      return;
    }

    if (newStatus === 'Presupuesto enviado') {
      setPendingStatusChange({ serviceId: service.id, newStatus });
      setModalToShow('presupuesto');
      return;
    }

    // Default: update immediately
    airtableService.updateServiceFields(service.id, {
      'Estado': newStatus,
      'Tramitado': false,
    })
      .then(() => {
        setServices(prev => prev.map(item => item.id === service.id ? { ...item, estado: newStatus, cita: undefined, tramitado: false } : item));
        if (selectedService?.id === service.id) {
          setSelectedService(prev => prev ? { ...prev, estado: newStatus, cita: undefined, tramitado: false } : null);
        }
        loadAppointments();
      })
      .catch(() => alert('Error al actualizar el estado'));
  };

  const handleModalSave = async (extraValue: string) => {
    if (!pendingStatusChange) return;
    const { serviceId, newStatus } = pendingStatusChange;

    try {
      if (modalToShow === 'cita') {
        await airtableService.updateServiceFields(serviceId, {
          'Estado': newStatus,
          'Cita': extraValue,
          'Tramitado': false,
        });
      } else if (modalToShow === 'resolucion') {
        await airtableService.updateServiceFields(serviceId, {
          'Estado': newStatus,
          'Resolución visita': extraValue,
          'Motivo técnico': null,
          'Tramitado': false,
        });
      } else if (modalToShow === 'motivo') {
        await airtableService.updateServiceFields(serviceId, {
          'Estado': newStatus,
          'Motivo técnico': extraValue,
          'Tramitado': false,
        });
      } else if (modalToShow === 'presupuesto') {
        await airtableService.updateServiceFields(serviceId, {
          'Estado': newStatus,
          'Presupuesto': extraValue,
          'Tramitado': false,
        });
      }

      setServices(prev => prev.map(item => {
        if (item.id === serviceId) {
          const updated = { ...item, estado: newStatus, tramitado: false };
          if (modalToShow === 'cita') updated.cita = extraValue;
          if (modalToShow === 'resolucion') {
            updated.resolucionVisita = extraValue;
            updated.motivoTecnico = undefined;
          }
          if (modalToShow === 'motivo') updated.motivoTecnico = extraValue;
          if (modalToShow === 'presupuesto') updated.presupuesto = extraValue;
          return updated;
        }
        return item;
      }));
      
      if (selectedService?.id === serviceId) {
        setSelectedService(prev => {
          if (!prev) return null;
          const updated = { ...prev, estado: newStatus, tramitado: false };
          if (modalToShow === 'cita') updated.cita = extraValue;
          if (modalToShow === 'resolucion') {
            updated.resolucionVisita = extraValue;
            updated.motivoTecnico = undefined;
          }
          if (modalToShow === 'motivo') updated.motivoTecnico = extraValue;
          if (modalToShow === 'presupuesto') updated.presupuesto = extraValue;
          return updated;
        });
      }
      loadAppointments();
    } catch (error) {
      alert('Error al guardar los cambios');
      throw error;
    } finally {
      setPendingStatusChange(null);
      setModalToShow(null);
    }
  };

  // Generar slots de 30 minutos desde las 8:00 hasta las 20:00
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        slots.push(`${hourStr}:${minuteStr}`);
      }
    }
    return slots;
  };

  // Obtener citas para el día actual
  const getAppointmentsForDay = (date: Date): AppointmentSlot[] => {
    const timeSlots = generateTimeSlots();
    const dateStr = date.toDateString();
    
    return timeSlots.map(time => {
      const service = services.find(s => {
        if (!s.cita) return false;
        const citaDate = new Date(s.cita);
        if (citaDate.toDateString() !== dateStr) return false;
        
        const citaTime = `${citaDate.getHours().toString().padStart(2, '0')}:${citaDate.getMinutes().toString().padStart(2, '0')}`;
        return citaTime === time;
      });
      
      return { time, service };
    });
  };

  const changeDay = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date): string => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const appointments = getAppointmentsForDay(currentDate);
  const appointmentsCount = appointments.filter(a => a.service).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando agenda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error al cargar agenda</h3>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={loadAppointments}
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
        <p className="text-gray-600 mt-2">Consulta tus citas programadas</p>
      </div>

      {/* Date navigator */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Día anterior"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">{formatDate(currentDate)}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {appointmentsCount} {appointmentsCount === 1 ? 'cita' : 'citas'}
            </p>
          </div>
          
          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Día siguiente"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-sm text-brand-primary hover:text-brand-hover font-medium"
          >
            Ir a hoy
          </button>
        </div>
      </div>

      {/* Appointments grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {appointments.map((slot, index) => (
            <div
              key={index}
              className={`p-4 flex items-center gap-4 ${
                slot.service ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'
              }`}
              onClick={() => slot.service && setSelectedService(slot.service)}
            >
              <div className="w-20 flex-shrink-0">
                <span className="text-sm font-medium text-gray-700">{slot.time}</span>
              </div>
              
              <div className="flex-1">
                {slot.service ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {slot.service.expediente || 'Sin expediente'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {slot.service.nombre || 'Sin nombre'}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-brand-primary text-white text-xs font-medium rounded-full">
                      {slot.service.estado || 'Sin estado'}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sin cita</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={!!selectedService}
        onClose={() => {
          setSelectedService(null);
          loadAppointments();
        }}
        title="Detalle del Servicio"
        size="lg"
      >
        {selectedService && (
          <ServiceDetails
            service={selectedService}
            onUpdate={(updated) => {
              setServices(prev => prev.map(s => s.id === updated.id ? updated : s));
              setSelectedService(updated);
            }}
            onStatusChange={handleStatusSelect}
            onClose={() => {
              setSelectedService(null);
              loadAppointments();
            }}
          />
        )}
      </Modal>

      {modalToShow === 'cita' && (
        <CitaModal
          isOpen={true}
          onClose={() => setModalToShow(null)}
          onSave={handleModalSave}
          initialDate={services.find(s => s.id === pendingStatusChange?.serviceId)?.cita}
        />
      )}

      {modalToShow === 'resolucion' && pendingStatusChange && (
        <ResolucionModal
          isOpen={true}
          onClose={() => setModalToShow(null)}
          onSave={handleModalSave}
          estado={pendingStatusChange.newStatus}
        />
      )}

      {modalToShow === 'motivo' && pendingStatusChange && (
        <MotivoTecnicoModal
          isOpen={true}
          onClose={() => setModalToShow(null)}
          onSave={handleModalSave}
          estado={pendingStatusChange.newStatus}
        />
      )}

      {modalToShow === 'presupuesto' && pendingStatusChange && (
        <PresupuestoModal
          isOpen={true}
          onClose={() => setModalToShow(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default Agenda;
