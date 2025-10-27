import React, { useEffect, useState } from 'react';
import { airtableService } from '../services/airtable';
import { Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InventarioItem {
  id: string;
  numeroSerie?: string;
  modelo?: string;
  observaciones?: string;
  ubicacion?: string;
  fechaAlta?: string; // solo para uso interno, no mostrar
}

const Inventario: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'Gestora Operativa') return;
    const fetchInventario = async () => {
      setLoading(true);
      try {
        const data = await airtableService.getInventario();
        setItems(data);
      } finally {
        setLoading(false);
      }
    };
    fetchInventario();
  }, [user?.role]);

  if (user?.role !== 'Gestora Operativa') {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-600 mt-2">Listado de inventario</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Info className="h-10 w-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros de inventario.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Número de serie</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observaciones</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.numeroSerie || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.modelo || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.observaciones || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{item.ubicacion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Inventario;
