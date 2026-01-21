import React from 'react';
import { Service } from '../../../types';
import { formatDate } from '../../../utils/helpers';
import { getStatusColors } from '../../../utils/statusColors';
import { Badge } from '../../ui/Badge';

interface ServiceHistorialViewProps {
  historialServicios: Service[];
}

export const ServiceHistorialView: React.FC<ServiceHistorialViewProps> = ({ historialServicios }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Servicios</h2>
      {historialServicios.length === 0 ? (
        <p className="text-gray-500 italic py-8 text-center border border-dashed rounded-lg">
          No hay otros servicios registrados para este número de teléfono.
        </p>
      ) : (
        <div className="space-y-4">
          {historialServicios.map((h) => (
            <div key={h.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-gray-900">
                  {h.numero || h.expediente || 'S/N'} - {formatDate(h.fechaRegistro)}
                </span>
                <Badge variant={getStatusColors(h.estado).bg as any}>
                  {h.estado || 'Sin estado'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{h.descripcion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
