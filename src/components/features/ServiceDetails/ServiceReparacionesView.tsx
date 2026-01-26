import React from 'react';
import { renderDetailValue, formatDateTime } from '../../../utils/helpers';
import { AirtableAttachment } from '../../../types';

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
  const selectedReparacion = reparaciones[selectedReparacionIndex] ?? {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = selectedReparacion[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  };
  const normalizeAttachments = (value: any): AirtableAttachment[] => (
    Array.isArray(value) ? value : []
  );
  const fotoPrincipal = normalizeAttachments(
    selectedReparacion['Foto'] ?? selectedReparacion.foto ?? selectedReparacion.fotoGeneral
  );
  const fotoEtiqueta = normalizeAttachments(
    selectedReparacion['Foto de la etiqueta'] ?? selectedReparacion.fotoEtiqueta
  );
  const fotosReparacion = [...fotoPrincipal, ...fotoEtiqueta];

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
              <p className="text-sm text-gray-900">{renderDetailValue(pick('Estado', 'estado', 'resultado'))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Técnico</p>
              <p className="text-sm text-gray-900">{renderDetailValue(pick('Técnico', 'tecnico'))}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Detalles</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {renderDetailValue(pick('Detalles', 'detalles'))}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Comentarios</p>
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {renderDetailValue(pick('Comentarios', 'comentarios'))}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-700 uppercase">Cita técnico</p>
              <p className="text-sm text-gray-900">
                {formatDateTime(pick('Cita técnico', 'cita'))}
              </p>
            </div>
          </div>
        </div>
      )}
      {reparaciones.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase">Fotos</p>
          {fotosReparacion.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {fotosReparacion.map((file: AirtableAttachment, i: number) => (
                <img
                  key={`${file.id || file.url || 'foto'}-${i}`}
                  src={file.thumbnails?.large?.url || file.url}
                  className="w-full h-40 object-cover rounded border hover:opacity-80 cursor-pointer"
                  onClick={() => window.open(file.url, '_blank')}
                  alt="Foto"
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic py-6 text-center border border-dashed rounded-lg">
              No se encontraron fotos para esta reparación.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
