import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Search, Phone, MessageCircle, X } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { supabaseService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Service } from '../types';
import { useEntityList } from '../hooks/useEntityList';
import { DataTable, Column } from '../components/common/DataTable';
import { Modal } from '../components/common/Modal';
import { ServiceDetails } from '../components/features/ServiceDetails/ServiceDetails';
import { CitaModal } from '../components/features/ServiceDetails/CitaModal';
import { getStatusColors, getSeguimientoColors } from '../utils/statusColors';
import { formatDateTime } from '../utils/helpers';
import { REPARACIONES_STATUS_OPTIONS, SEGUIMIENTO_OPTIONS } from '../utils/constants';

const Reparaciones: React.FC = () => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:17',message:'Component render',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [lastSelectedServiceId, setLastSelectedServiceId] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<{ id: string; nombre?: string }[]>([]);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ serviceId: string; newStatus: string } | null>(null);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const processedNumerosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:30',message:'Fetching technicians',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    airtableService.getTechnicians()
      .then(t => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:33',message:'Technicians fetched',data:{count:t.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setTechnicians(t);
      })
      .catch(err => {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:38',message:'Error fetching technicians',data:{error:err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error(err);
      });
  }, []);

  const technicianMap = useMemo(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:31',message:'Generating technicianMap',data:{count:technicians.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return technicians.reduce<Record<string, string>>((acc: Record<string, string>, t: { id: string; nombre?: string }) => {
      if (t.id && t.nombre) acc[t.id] = t.nombre;
      return acc;
    }, {});
  }, [technicians]);

  const getTechnicianName = (service: Service): string => {
    if (!service.tecnico) return '-';
    if (typeof service.tecnico === 'string') return service.tecnico || '-';
    if (Array.isArray(service.tecnico)) {
      const names = service.tecnico.map(id => technicianMap[id]).filter(Boolean);
      return names.length > 0 ? names.join(', ') : '-';
    }
    return '-';
  };

  const {
    data: filteredServices,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    setData,
  } = useEntityList<Service>({
    fetchFn: () => airtableService.getReparaciones(),
    searchFields: ['cliente', 'telefono', 'estado', 'seguimiento', 'expediente'],
    dependencies: [user?.id],
    sortFn: (a: Service, b: Service) => {
      const dateA = a.fechaEstado ? new Date(a.fechaEstado).getTime() : 0;
      const dateB = b.fechaEstado ? new Date(b.fechaEstado).getTime() : 0;
      return dateB - dateA; // Más recientes primero
    },
  });

  const technicianNameRef = useRef<Record<string, string>>({});

  useEffect(() => {
    filteredServices.forEach(s => {
      technicianNameRef.current[s.id] = getTechnicianName(s);
    });
  }, [filteredServices, technicianMap]);

  // Ensure tramitaciones records exist
  useEffect(() => {
    if (user?.role === 'Administrativa' && filteredServices.length > 0) {
      const numeros = filteredServices
        .map((s: Service) => s.numero)
        .filter((n: string | undefined): n is string => !!(n && !processedNumerosRef.current.has(`tramitacion-${n}`)));
      
      if (numeros.length > 0) {
        numeros.forEach((n: string) => processedNumerosRef.current.add(`tramitacion-${n}`));
        supabaseService.ensureTramitaciones(numeros);
      }
    }
  }, [filteredServices, user?.role]);

  const handleStatusChange = async (s: Service, newValue: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:113',message:'handleStatusChange start',data:{id:s.id, newValue},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!newValue || newValue === s.estado) return;

    if (newValue === 'Citado') {
      setPendingStatusChange({ serviceId: s.id, newStatus: newValue });
      setShowCitaModal(true);
      return;
    }

    try {
      await airtableService.updateServiceField(s.id, 'Estado', newValue, 'Reparaciones');
      setData((prev: Service[]) => prev.map((item: Service) => item.id === s.id ? { ...item, estado: newValue } : item));
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:126',message:'handleStatusChange success',data:{id:s.id, newValue},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (err: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:129',message:'handleStatusChange error',data:{id:s.id, newValue, error: err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      alert('Error al actualizar');
    }
  };

  const handleCitaSave = async (isoDate: string) => {
    if (!pendingStatusChange) return;
    const { serviceId, newStatus } = pendingStatusChange;

    try {
      await airtableService.updateServiceField(serviceId, 'Estado', newStatus, 'Reparaciones');
      await airtableService.updateServiceField(serviceId, 'Cita', isoDate, 'Reparaciones');
      setData((prev: Service[]) => prev.map((item: Service) => item.id === serviceId ? { ...item, estado: newStatus, cita: isoDate } : item));
    } catch (error) {
      alert('Error al guardar la cita');
      throw error;
    } finally {
      setPendingStatusChange(null);
      setShowCitaModal(false);
    }
  };

  const columns: Column<Service>[] = [
    {
      header: 'Cliente',
      accessor: 'cliente' as keyof Service,
      className: 'font-medium max-w-[11rem] truncate',
    },
    {
      header: 'Técnico',
      accessor: (s: Service) => getTechnicianName(s),
      className: 'max-w-[11rem] truncate',
    },
    {
      header: 'Estado',
      accessor: (s: Service) => {
        const colors = getStatusColors(s.estado);
    return (
          <select
            value={s.estado || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(s, e.target.value)}
            className={`py-1 px-2 text-xs font-semibold rounded-full border-0 inline-block appearance-none text-center ${colors.bg} ${colors.text}`}
            style={{ minWidth: '140px' }}
          >
            <option value="">Seleccionar...</option>
            {REPARACIONES_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      }
    },
    {
      header: 'Fecha estado',
      accessor: (s: Service) => formatDateTime(s.fechaEstado),
    },
    {
      header: 'Seguimiento',
      accessor: (s: Service) => {
        const colors = getSeguimientoColors(s.seguimiento);
    return (
          <select
            value={s.seguimiento || ''}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
              const newValue = e.target.value;
              // #region agent log
              fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:210',message:'Seguimiento change attempt',data:{id:s.id, newValue, old: s.seguimiento},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              if (!newValue || newValue === s.seguimiento) return;
              try {
                await airtableService.updateServiceField(s.id, 'Seguimiento', newValue, 'Reparaciones');
                const numeroIdentificador = s.numero || s.expediente;
                if (numeroIdentificador) {
                  await supabaseService.trackTramitacion(numeroIdentificador, undefined, new Date().toISOString());
                }
                setData((prev: Service[]) => prev.map((item: Service) => item.id === s.id ? { ...item, seguimiento: newValue } : item));
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:220',message:'Seguimiento change success',data:{id:s.id, newValue},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
              } catch (err: any) {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9ae1826f-8438-41dd-a48f-f5e848b7c433',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Reparaciones.tsx:224',message:'Seguimiento change error',data:{id:s.id, newValue, error: err.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                alert('Error al actualizar');
              }
            }}
            className={`py-1 px-2 text-xs font-semibold rounded-full border-0 inline-block appearance-none text-center ${colors.bg} ${colors.text}`}
            style={{ minWidth: '180px' }}
          >
            <option value="">Seleccionar...</option>
            {SEGUIMIENTO_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      }
    },
    {
      header: 'Fecha seguimiento',
      accessor: (s: Service) => formatDateTime(s.fechaSeguimiento),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
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

      <DataTable
        data={filteredServices}
        columns={columns}
        isLoading={loading}
        selectedRowId={lastSelectedServiceId || undefined}
        onRowClick={(s) => {
          setSelectedService(s);
          setLastSelectedServiceId(s.id);
        }}
        emptyMessage={error || "No hay reparaciones en este momento."}
      />

      <Modal
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        title="Detalle de la Reparación"
        size="lg"
        showCloseButton={false}
        actions={selectedService && (
          <div className="flex items-center gap-2">
            {selectedService.telefono && (
              <a
                href={`tel:${selectedService.telefono}`}
                className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
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
                className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                title="Abrir chat"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            <button
              onClick={() => setSelectedService(null)}
              className="ml-2 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      >
        {selectedService && (
          <ServiceDetails
            service={selectedService}
            variant="reparaciones"
            onUpdate={(updated) => setData(prev => prev.map(s => s.id === updated.id ? updated : s))}
            onClose={() => setSelectedService(null)}
            technicianName={technicianNameRef.current[selectedService.id]}
          />
        )}
      </Modal>

      {showCitaModal && (
        <CitaModal
          isOpen={true}
          onClose={() => setShowCitaModal(false)}
          onSave={handleCitaSave}
          initialDate={filteredServices.find(s => s.id === pendingStatusChange?.serviceId)?.cita}
        />
      )}
    </div>
  );
};

export default Reparaciones;
