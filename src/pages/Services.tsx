import React, { ChangeEvent, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { supabaseService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Service } from '../types';
import { useEntityList } from '../hooks/useEntityList';
import { useAppointmentAlert } from '../hooks/useAppointmentAlert';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { ServiceDetails } from '../components/features/ServiceDetails/ServiceDetails';
import { CitaModal } from '../components/features/ServiceDetails/CitaModal';
import { ResolucionModal } from '../components/features/ServiceDetails/ResolucionModal';
import { MotivoTecnicoModal } from '../components/features/ServiceDetails/MotivoTecnicoModal';
import { getStatusColors, getIpartnerColors } from '../utils/statusColors';
import { formatDate } from '../utils/helpers';
import { STATUS_OPTIONS, IPARTNER_OPTIONS } from '../utils/constants';

type ServicesVariant = 'servicios' | 'tramitaciones';

interface ServicesProps {
  variant?: ServicesVariant;
  initialSelectedServiceId?: string;
  onClose?: () => void;
}

const Services: React.FC<ServicesProps> = ({ variant = 'servicios', initialSelectedServiceId }) => {
  const { user } = useAuth();
  const isTramitacion = variant === 'tramitaciones';
  const isTecnico = user?.role === 'Técnico';
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ serviceId: string; newStatus: string } | null>(null);
  const [modalToShow, setModalToShow] = useState<'cita' | 'resolucion' | 'motivo' | null>(null);

  const fetchFn = async () => {
    if (isTramitacion) {
      const workerEmail = isTecnico ? user?.email : undefined;
      return await airtableService.getTramitaciones(user?.clinic, undefined, workerEmail, { onlyUnsynced: true });
    }

    const workerEmail = user?.email;
    return await airtableService.getServices(undefined, undefined, workerEmail, { view: 'Servicios' });
  };

  const {
    data: services,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setData,
  } = useEntityList<Service>({
    fetchFn,
    searchFields: ['expediente', 'nombre', 'telefono', 'direccion', 'estado', 'estadoIpas', 'numero'],
    dependencies: [variant, user?.clinic, user?.id, user?.email],
    sortFn: (a, b) => {
      const dateA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const dateB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return dateB - dateA; // Más recientes primero
    },
    filterFn: (s: Service): boolean => {
      if (!isTramitacion) {
        if (s.estado === 'Citado') {
          if (!s.cita) return false;
          const citaDate = new Date(s.cita);
          if (Number.isNaN(citaDate.getTime())) return false;
          return citaDate.getTime() <= Date.now();
        }
        return true;
      }

      const accionStr = typeof s.accionIpartner === 'string' ? s.accionIpartner : 
                       Array.isArray(s.accionIpartner) ? (s.accionIpartner as string[]).join(', ') : 
                       String(s.accionIpartner || '');

      return !!(!s.tramitado && accionStr.trim() !== '' && s.ipartner !== 'Cancelado' && s.ipartner !== 'Facturado');
    }
  });

  const { appointmentAlert, dismissAlert } = useAppointmentAlert(services);

  // Auto-select service if initialSelectedServiceId is provided
  useEffect(() => {
    if (initialSelectedServiceId && services.length > 0 && !selectedService) {
      const service = services.find(s => s.id === initialSelectedServiceId);
      if (service) {
        setSelectedService(service);
        setLastSelectedServiceId(service.id);
      }
    }
  }, [initialSelectedServiceId, services, selectedService]);

  const handleRowClick = (s: Service) => {
    setSelectedService(s);
    setLastSelectedServiceId(s.id);
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

    if (['Cancelado', 'Finalizado', 'Presupuesto enviado'].includes(newStatus)) {
      setPendingStatusChange({ serviceId: service.id, newStatus });
      setModalToShow('resolucion');
      return;
    }

    // Default: update immediately
    airtableService.updateServiceStatus(service.id, newStatus)
      .then(() => {
        setData(prev => prev.map(item => item.id === service.id ? { ...item, estado: newStatus, cita: undefined } : item));
      })
      .catch(() => alert('Error al actualizar el estado'));
  };

  const handleModalSave = async (extraValue: string) => {
    if (!pendingStatusChange) return;
    const { serviceId, newStatus } = pendingStatusChange;

    try {
      if (modalToShow === 'cita') {
        await airtableService.updateServiceStatus(serviceId, newStatus);
        await airtableService.updateServiceField(serviceId, 'Cita', extraValue);
      } else if (modalToShow === 'resolucion') {
        await airtableService.updateServiceStatus(serviceId, newStatus);
        const field = newStatus === 'Cancelado' ? 'Motivo cancelación' : 'Resolución visita';
        await airtableService.updateServiceField(serviceId, field, extraValue);
      } else if (modalToShow === 'motivo') {
        await airtableService.updateServiceStatus(serviceId, newStatus);
        await airtableService.updateServiceField(serviceId, 'motivoTecnico', extraValue);
      }

      setData((prev: Service[]) => prev.map((item: Service) => {
        if (item.id === serviceId) {
          const updated = { ...item, estado: newStatus };
          if (modalToShow === 'cita') updated.cita = extraValue;
          if (modalToShow === 'resolucion') {
            if (newStatus === 'Cancelado') updated.motivoCancelacion = extraValue;
            else updated.resolucionVisita = extraValue;
          }
          if (modalToShow === 'motivo') updated.motivoTecnico = extraValue;
          return updated;
        }
        return item;
      }));
      
      // If the selected service is the one being updated, refresh it too
      if (selectedService?.id === serviceId) {
        setSelectedService(prev => prev ? { ...prev, estado: newStatus } : null);
      }
    } catch (error) {
      alert('Error al guardar los cambios');
      throw error;
    } finally {
      setPendingStatusChange(null);
      setModalToShow(null);
    }
  };

  const columns: Column<Service>[] = [
    {
      header: 'Número',
      accessor: (s: Service) => isTramitacion ? (s.numero || '-') : (s.numero || s.expediente || '-'),
    },
    ...(isTramitacion ? [{
      header: 'Expediente',
      accessor: 'expediente' as keyof Service,
    }] : []),
    {
      header: 'Fecha Registro',
      accessor: (s: Service) => formatDate(s.fechaRegistro),
    },
    {
      header: 'Instalación',
      accessor: (s: Service) => formatDate(s.fechaInstalacion),
    },
    {
      header: 'Nombre',
      accessor: 'nombre',
      className: 'max-w-[10rem] truncate',
    },
    ...(isTramitacion ? [
      {
        header: 'Ipartner',
        accessor: (s: Service) => {
          const colors = getIpartnerColors(s.ipartner);
          return (
            <select
              value={s.ipartner || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={async (e: ChangeEvent<HTMLSelectElement>) => {
                const newValue = e.target.value;
                if (!newValue || newValue === s.ipartner) return;
                try {
                  await airtableService.updateServiceFields(s.id, { 'Ipartner': newValue, 'Tramitado': true });
                  if (s.numero) await supabaseService.completeTramitacion(s.numero);
                  setData((prev: Service[]) => prev.map((item: Service) => item.id === s.id ? { ...item, ipartner: newValue, tramitado: true } : item));
                } catch (err) {
                  alert('Error al actualizar');
                }
              }}
              className={`py-1 px-3 text-xs font-semibold rounded-full border-0 appearance-none text-center ${colors.bg} ${colors.text}`}
            >
              <option value="">Seleccionar...</option>
              {IPARTNER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        }
      },
      {
        header: 'Importe',
        accessor: (s: Service) => (
          <input
            type="number"
            step="0.01"
            defaultValue={s.importe || ''}
            onBlur={async (e: React.FocusEvent<HTMLInputElement>) => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value);
              if (val === s.importe) return;
              try {
                await airtableService.updateServiceField(s.id, 'Importe', val);
                setData((prev: Service[]) => prev.map((item: Service) => item.id === s.id ? { ...item, importe: val ?? undefined } : item));
              } catch (err) {
                alert('Error al guardar');
              }
            }}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        )
      }
    ] : [
      {
        header: 'Teléfono',
        accessor: 'telefono' as keyof Service,
      },
      {
        header: 'Estado',
        accessor: (s: Service) => {
          const colors = getStatusColors(s.estado);
          return (
            <select
              value={s.estado || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusSelect(s, e.target.value)}
              className={`py-1 px-3 text-xs font-semibold rounded-full border-0 appearance-none text-center ${colors.bg} ${colors.text}`}
            >
              <option value="">Seleccionar...</option>
              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          );
        }
      },
      {
        header: 'Último Cambio',
        accessor: (s: Service) => formatDate(s.ultimoCambio),
      }
    ]),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">{isTramitacion ? 'Tramitaciones' : 'Servicios'}</h1>
          <p className="text-gray-600 mt-2">
            {isTramitacion 
              ? 'Consulta y gestiona las tramitaciones pendientes de sincronizar.' 
              : 'Consulta y gestiona los servicios activos de punto de recarga.'
            }
                      </p>
        </div>
        {!isTramitacion && appointmentAlert && (
          <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96">
            <div className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4 transition-shadow hover:shadow-md">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm font-semibold">Tienes una cita con el cliente {appointmentAlert.nombre || 'sin nombre'} ahora.</p>
                  <p className="text-xs text-green-800 mt-1">Recuerda llamarle.</p>
                </div>
                <button
                  aria-label="Cerrar aviso de cita"
                  className="text-green-700 hover:text-green-900"
                  onClick={() => dismissAlert(appointmentAlert.id)}
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
              placeholder={`Buscar por expediente, nombre, teléfono...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent shadow-sm"
            />
          </div>
        </div>
      </div>

      <DataTable
        data={services}
        columns={columns}
        isLoading={loading}
        selectedRowId={lastSelectedServiceId || undefined}
        onRowClick={handleRowClick}
        emptyMessage={error || "No hay servicios para mostrar."}
      />

      <Modal
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        title={isTramitacion ? 'Detalle de Tramitación' : 'Detalle del Servicio'}
        size="lg"
      >
        {selectedService && (
          <ServiceDetails
            service={selectedService}
            variant={variant}
            onUpdate={(updated) => setData(prev => prev.map(s => s.id === updated.id ? updated : s))}
            onStatusChange={handleStatusSelect}
            onClose={() => setSelectedService(null)}
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
    </div>
  );
};

export default Services;
