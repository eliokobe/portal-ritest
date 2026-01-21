import React from 'react';
import { renderDetailValue, formatDateTime } from '../../../utils/helpers';

interface ServiceReparacionesViewProps {
  reparaciones: any[];
  selectedReparacionIndex: number;
  setSelectedReparacionIndex: (idx: number) => void;
}

export const ServiceReparacionesView: React.FC<ServiceReparacionesViewProps> = ({
  reparaciones,
  selectedReparacionIndex,
  setSelectedReparacionIndex,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Reparaciones</h2>
        {reparaciones.length > 1 && (
          <select
            value={selectedReparacionIndex}
            onChange={(e) => setSelectedReparacionIndex(parseInt(e.target.value))}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            {reparaciones.map((_, i) => (
              <option key={i} value={i}>
                Reparación {i + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      {reparaciones.length === 0 ? (
        <p className="text-gray-500 italic py-8 text-center border border-dashed rounded-lg">
          No hay reparaciones vinculadas a este servicio.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Estado</p>
              <p className="text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex].Estado)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Resultado</p>
              <p className="text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex].Resultado)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Reparación</p>
              <p className="text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex].Reparación)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Técnico</p>
              <p className="text-sm text-gray-900">{renderDetailValue(reparaciones[selectedReparacionIndex].Técnico)}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Detalles</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {renderDetailValue(reparaciones[selectedReparacionIndex].Detalles)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Comentarios</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {renderDetailValue(reparaciones[selectedReparacionIndex].Comentarios)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Cita técnico</p>
              <p className="text-sm text-gray-900">
                {formatDateTime(reparaciones[selectedReparacionIndex]['Cita técnico'])}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
