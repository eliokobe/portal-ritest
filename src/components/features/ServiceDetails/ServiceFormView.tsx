import React from 'react';
import { Service, AirtableAttachment } from '../../../types';
import { EditableField } from '../../ui/EditableField';
import { airtableService } from '../../../services/airtable';

interface ServiceFormViewProps {
  service: Service;
  formularios: any[];
  selectedFormularioIndex: number;
  setSelectedFormularioIndex: (idx: number) => void;
  isTramitacion: boolean;
  loadFormularios: (params: any) => Promise<void>;
  uploadingPhoto: string | null;
  handlePhotoUpload: (formId: string, field: string, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const ServiceFormView: React.FC<ServiceFormViewProps> = ({
  service,
  formularios,
  selectedFormularioIndex,
  setSelectedFormularioIndex,
  isTramitacion,
  loadFormularios,
  uploadingPhoto,
  handlePhotoUpload,
}) => {
  const currentForm = formularios[selectedFormularioIndex];

  if (!currentForm) return null;

  const handleUpdate = async (field: string, val: string) => {
    await airtableService.updateFormularioField(currentForm.id, field, val);
    await loadFormularios({
      formularioIds: service.formularioId,
      expediente: service.expediente,
      direccion: service.direccion,
      nombre: service.nombre,
      isTramitacion,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Formulario</h2>
        {formularios.length > 1 && (
          <select
            value={selectedFormularioIndex}
            onChange={(e) => setSelectedFormularioIndex(parseInt(e.target.value))}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            {formularios.map((_, i) => (
              <option key={i} value={i}>
                Formulario {i + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700 uppercase">Detalles</p>
          <EditableField
            value={currentForm.Detalles || ''}
            type="textarea"
            onSave={(val) => handleUpdate('Detalles', val)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700 uppercase">Potencia contratada</p>
          <EditableField
            value={currentForm['Potencia contratada'] || ''}
            onSave={(val) => handleUpdate('Potencia contratada', val)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-700 uppercase">Fecha instalación</p>
          <EditableField
            value={currentForm['Fecha instalación'] || ''}
            type="date"
            onSave={(val) => handleUpdate('Fecha instalación', val)}
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Fotos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'fotoGeneral', label: 'Foto general', field: 'Foto general' },
            { id: 'fotoEtiqueta', label: 'Foto etiqueta', field: 'Foto etiqueta' },
            { id: 'fotoRoto', label: 'Foto roto', field: 'Foto roto' },
            { id: 'fotoCuadro', label: 'Foto cuadro', field: 'Foto cuadro' },
          ].map((photoConfig) => (
            <div key={photoConfig.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">{photoConfig.label}</p>
                <label className="cursor-pointer text-[10px] bg-brand-primary text-white px-2 py-0.5 rounded hover:bg-brand-hover transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(currentForm.id, photoConfig.id, e)}
                    disabled={uploadingPhoto !== null}
                  />
                  {uploadingPhoto === photoConfig.id ? '...' : 'Subir'}
                </label>
              </div>
              {currentForm[photoConfig.field]?.map((file: AirtableAttachment, i: number) => (
                <img
                  key={i}
                  src={file.thumbnails?.large?.url || file.url}
                  className="w-full h-32 object-cover rounded border hover:opacity-80 cursor-pointer"
                  onClick={() => window.open(file.url, '_blank')}
                  alt={photoConfig.label}
                />
              ))}
              {(!currentForm[photoConfig.field] || currentForm[photoConfig.field].length === 0) && (
                <p className="text-xs text-gray-400 italic py-4 text-center border border-dashed rounded">Sin foto</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
