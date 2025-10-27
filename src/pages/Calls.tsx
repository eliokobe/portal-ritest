import React, { useEffect, useMemo, useState } from 'react';
import { PhoneCall, Calendar /*, PlayCircle */ } from 'lucide-react';
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
};

const Calls: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        // Intenta con la clínica del usuario; si no hay resultados, reintenta sin filtro para alinear con el dashboard
        const withClinic = await airtableService.getCalls(user?.clinic);
        if (withClinic.length === 0 && user?.clinic) {
          const all = await airtableService.getCalls();
          setCalls(all);
        } else {
          setCalls(withClinic);
        }
      } catch (e) {
        console.error('Error fetching calls', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [user?.clinic]);

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
      return true;
    });
  }, [calls, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
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
        <h1 className="text-3xl font-bold text-gray-900">Llamadas</h1>
        <p className="text-gray-600 mt-2">Historial de llamadas y grabaciones</p>
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
        <div className="text-xs text-gray-500 mt-2">Mostrando {filtered.length} de {calls.length} llamadas</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <PhoneCall className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay llamadas registradas</p>
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
                      <span className="text-sm text-gray-700">{c.status || '—'}</span>
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
