import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import Services from './Services';

interface Service {
  id: string;
  expediente?: string;
  nombre?: string;
  estado?: string;
  cita?: string;
  telefono?: string;
  tecnico?: string;
}

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
      const withAppointments: Service[] = allServices
        .filter(s => s.cita && s.estado === 'Citado' && !s.tecnico)
        .map(s => ({
          id: s.id,
          expediente: s.expediente,
          nombre: s.nombre,
          estado: s.estado,
          cita: s.cita,
          telefono: s.telefono,
          tecnico: typeof s.tecnico === 'string' ? s.tecnico : undefined
        }));
      
      setServices(withAppointments);
    } catch (err) {
      setError('Error al cargar las citas');
    } finally {
      setLoading(false);
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

  // Si hay un servicio seleccionado, mostrar el componente Services con ese servicio
  if (selectedService) {
    return (
      <div>
        <Services 
          variant="servicios" 
          initialSelectedServiceId={selectedService.id}
          onClose={() => setSelectedService(null)}
        />
      </div>
    );
  }

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
    </div>
  );
};

export default Agenda;
