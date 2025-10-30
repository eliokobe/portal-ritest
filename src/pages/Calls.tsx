import React, { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Calendar, ChevronDown, X /*, PlayCircle */ } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

export type CallItem = {
  id: string;
  phone?: string;
  status?: string;
  clinic?: string;
  date?: string;
  time?: string;
  recordingUrl?: string;
  advisor?: string;
};

const ESTADO_OPTIONS = [
  '1ª Llamada',
  '2ª Llamada',
  'Citado',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés'
];

const Calls: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        // Intenta con la clínica del usuario y su email como asesor; si no hay resultados, reintenta sin filtro para alinear con el dashboard
        const withFilters = await airtableService.getCalls(user?.clinic, user?.email);
        if (withFilters.length === 0 && (user?.clinic || user?.email)) {
          const all = await airtableService.getCalls();
          setCalls(all);
        } else {
          setCalls(withFilters);
        }
      } catch (e) {
        console.error('Error fetching calls', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [user?.clinic, user?.email]);

  const statuses = useMemo(() => {
    const s = Array.from(new Set(calls.map(c => (c.status ?? '').trim()).filter(Boolean)));
    s.sort((a, b) => a.localeCompare(b, 'es'));
    return s;
  }, [calls]);

  const filtered = useMemo(() => {
    return calls.filter(c => {
      if (!c.date) return false; // sin fecha no se muestra
      const d = new Date(c.date);
      if (!isNaN(d.getTime())) {
        if (startDate) {
          const sd = new Date(startDate);
          // incluir el día de inicio (compara a medianoche)
          if (d < sd) return false;
        }
        if (endDate) {
          const ed = new Date(endDate);
          // incluir el día final (agregar 1 día para inclusión)
          const edInclusive = new Date(ed.getTime() + 24 * 60 * 60 * 1000);
          if (d >= edInclusive) return false;
        }
      }
      if (statusFilter && c.status?.trim() !== statusFilter) return false;
      
      // Filtrar por estados específicos para asesoramiento: 1ª Llamada, 2ª Llamada, Citado, o estado vacío
      const allowedStatuses = ['1ª Llamada', '2ª Llamada', 'Citado'];
      const callStatus = c.status?.trim();
      const isAllowedStatus = allowedStatuses.includes(callStatus || '') || !callStatus;
      
      return isAllowedStatus;
    });
  }, [calls, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleSaveStatus = async (callId: string, newStatus: string) => {
    if (savingStatus) return;
    
    setSavingStatus(true);
    try {
      await airtableService.updateCall(callId, newStatus);
      
      setCalls(prev => 
        prev.map(call => 
          call.id === callId 
            ? { ...call, status: newStatus }
            : call
        )
      );
      
      setEditingStatus(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCancelStatusEdit = () => {
    setEditingStatus(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Asesoramiento</h1>
        <p className="text-gray-600 mt-2">Llamadas pendientes de asesoramiento (1ª Llamada, 2ª Llamada, Citado)</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-full px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark/30"
            >
              <option value="">Todos</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-full px-3 py-2 text-sm"
            />
          </div>
          <div className="md:ml-auto">
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-full border text-sm text-gray-700 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
                <div className="text-xs text-gray-500 mt-2">Mostrando {filtered.length} de {calls.length} llamadas de asesoramiento</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay llamadas pendientes de asesoramiento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grabación</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{c.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingStatus === c.id ? (
                        <div className="flex items-center space-x-1">
                          <select
                            value={c.status || ''}
                            onChange={(e) => handleSaveStatus(c.id, e.target.value)}
                            disabled={savingStatus}
                            className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-brand-dark/30 focus:border-transparent disabled:opacity-50"
                            autoFocus
                          >
                            <option value="">Seleccionar estado</option>
                            {ESTADO_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleCancelStatusEdit}
                            disabled={savingStatus}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span 
                          className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                          onClick={() => setEditingStatus(c.id)}
                          title="Click para cambiar estado"
                        >
                          {c.status || 'Sin estado'}
                          <ChevronDown className="h-3 w-3 ml-1 inline" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {c.date ? new Date(c.date).toLocaleDateString('es-ES') : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{c.time || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.recordingUrl ? (
                        <div className="w-56 sm:w-64 md:w-72 lg:w-80">
                          <audio
                            controls
                            preload="none"
                            className="w-full h-9 [&::-webkit-media-controls-panel]:bg-gray-100 [&::-webkit-media-controls-panel]:rounded-full [&::-webkit-media-controls-enclosure]:rounded-full"
                            src={c.recordingUrl}
                          >
                            Tu navegador no soporta audio.
                          </audio>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calls;
