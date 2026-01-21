import React from 'react';
import { AirtableAttachment } from '../../../types';

interface ServicePhotosViewProps {
  mixedPhotos: AirtableAttachment[];
}

export const ServicePhotosView: React.FC<ServicePhotosViewProps> = ({ mixedPhotos }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Fotos de Referencia</h2>
      {mixedPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mixedPhotos.map((file: AirtableAttachment, i: number) => (
            <img
              key={`${file.id || file.url || 'photo'}-${i}`}
              src={file.thumbnails?.large?.url || file.url}
              className="w-full h-40 object-cover rounded border hover:opacity-80 cursor-pointer"
              onClick={() => window.open(file.url, '_blank')}
              alt="Foto"
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic py-8 text-center border border-dashed rounded-lg">
          No se encontraron fotos de referencia.
        </p>
      )}
    </div>
  );
};
