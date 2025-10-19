import { useState, useEffect } from 'react';
import { Search, User, ChevronDown, X } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { Registro } from '../types';

const ESTADO_OPTIONS = [
  '1ª Llamada',
  '2ª Llamada',
  'Ilocalizable',
  'No interesado',
  'Informe',
  'Inglés'
];

export default function Registros() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      const data = await airtableService.getRegistros();
      setRegistros(data);
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = async (registroId: string, newStatus: string) => {
    if (savingStatus) return;
    
    setSavingStatus(true);
    try {
      await airtableService.updateRegistro(registroId, { estado: newStatus });
      
      setRegistros(prev => 
        prev.map(registro => 
          registro.id === registroId 
            ? { ...registro, estado: newStatus }
            : registro
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case '1ª Llamada':
        return 'bg-green-50 text-green-700';
      case '2ª Llamada':
        return 'bg-green-100 text-green-800';
      case 'Ilocalizable':
        return 'bg-gray-100 text-gray-600';
      case 'No interesado':
        return 'bg-gray-200 text-gray-700';
      case 'Informe':
        return 'bg-green-200 text-green-900';
      case 'Inglés':
        return 'bg-green-300 text-green-950';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRegistros = registros.filter(registro => {
    const matchesSearch = !searchTerm || 
      registro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.telefono?.includes(searchTerm) ||
      registro.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      registro.contrato?.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Asesoramientos</h1>
          <p className="text-gray-600 mt-2">Visualización y gestión de estados de asesoramientos</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, email, dirección o número de contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contrato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <User className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-lg font-medium">No se encontraron registros</p>
                    <p className="mt-1">Intenta ajustar los criterios de búsqueda</p>
                  </td>
                </tr>
              ) : (
                filteredRegistros.map((registro) => (
                  <tr key={registro.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.contrato || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.telefono || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={registro.direccion}>
                        {registro.direccion || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {registro.email || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingStatus === registro.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={registro.estado || ''}
                            onChange={(e) => handleSaveStatus(registro.id, e.target.value)}
                            disabled={savingStatus}
                            className="text-xs font-semibold rounded-full px-2 py-1 border border-gray-300 focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50"
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
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${getStatusColor(registro.estado)}`}
                          onClick={() => setEditingStatus(registro.id)}
                          title="Click para cambiar estado"
                        >
                          {registro.estado || 'Sin estado'}
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(registro.fecha)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
