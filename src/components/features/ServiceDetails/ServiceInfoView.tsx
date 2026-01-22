import React from 'react';
import { Service } from '../../../types';
import { renderDetailValue, formatDateTime, formatDateTimeForInput, parseCitaInput, formatDate, formatDateForInput, parseDateInput } from '../../../utils/helpers';
import { getStatusColors, getIpartnerColors } from '../../../utils/statusColors';
import { STATUS_OPTIONS, IPARTNER_OPTIONS } from '../../../utils/constants';
import { EditableField } from '../../ui/EditableField';
import { Textarea } from '../../ui/Textarea';

interface ServiceInfoViewProps {
  service: Service;
  isReparacion: boolean;
  isTramitacion: boolean;
  isTecnico: boolean;
  isGestoraTecnica: boolean;
  technicianName?: string;
  tecnicos: { id: string; nombre: string }[];
  onStatusChange?: (service: Service, newStatus: string) => void;
  handleFieldUpdate: (field: string, value: any, airtableField?: string) => Promise<void>;
  newComment: string;
  setNewComment: (val: string) => void;
  handleCommentAdd: (comment: string) => Promise<void>;
}

export const ServiceInfoView: React.FC<ServiceInfoViewProps> = ({
  service,
  isReparacion,
  isTramitacion,
  isTecnico,
  isGestoraTecnica,
  technicianName,
  tecnicos,
  onStatusChange,
  handleFieldUpdate,
  newComment,
  setNewComment,
  handleCommentAdd,
}) => {
  return (
    <div className="space-y-6">
      {!isReparacion && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Detalle del servicio</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isTramitacion 
              ? `Número: ${service.numero || '-'} | Expediente: ${service.expediente || '-'}`
              : `Número ${service.numero || service.expediente || 'sin número asignado'}`
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isReparacion ? (
          <>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Número</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.numero)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Teléfono</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.telefono)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Dirección</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.direccion)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Población</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.poblacion)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Provincia</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.provincia)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Código postal</p>
              <p className="text-sm text-gray-900">{renderDetailValue(service.codigoPostal)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Estado</p>
              <select
                value={service.estado || ''}
                onChange={(e) => {
                  const newVal = e.target.value;
                  if (onStatusChange) {
                    onStatusChange(service, newVal);
                  } else {
                    handleFieldUpdate('estado', newVal, 'Estado');
                  }
                }}
                className={`py-1 px-3 text-xs font-semibold rounded-full border-0 appearance-none text-center ${getStatusColors(service.estado).bg} ${getStatusColors(service.estado).text}`}
              >
                <option value="">Seleccionar...</option>
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Cita</p>
              <EditableField
                value={formatDateTimeForInput(service.cita)}
                onSave={async (val) => {
                  const date = parseCitaInput(val);
                  if (date) await handleFieldUpdate('cita', date.toISOString(), 'Cita');
                }}
                placeholder="DD/MM/YYYY hh:mm"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Nombre técnico</p>
              <p className="text-sm text-gray-900 font-medium">
                {technicianName || 'Sin información'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Teléfono técnico</p>
              <p className="text-sm text-gray-900 font-medium">
                {service.telefonoTecnico || 'Sin información'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Fecha de instalación</p>
              <p className="text-sm text-gray-900">{renderDetailValue(formatDate(service.fechaInstalacion))}</p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Expediente</p>
              {!isTramitacion ? (
                <EditableField
                  value={service.expediente || ''}
                  onSave={(val) => handleFieldUpdate('expediente', val, 'Expediente')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.expediente)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Nombre</p>
              {!isTramitacion ? (
                <EditableField
                  value={service.nombre || ''}
                  onSave={(val) => handleFieldUpdate('nombre', val, 'Nombre')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.nombre)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Teléfono</p>
              {!isTramitacion ? (
                <EditableField
                  value={service.telefono || ''}
                  type="tel"
                  onSave={(val) => handleFieldUpdate('telefono', val, 'Teléfono')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.telefono)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Dirección</p>
              {!isTramitacion ? (
                <EditableField
                  value={service.direccion || ''}
                  onSave={(val) => handleFieldUpdate('direccion', val, 'Dirección')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.direccion)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Población</p>
              {!isTramitacion && !isReparacion ? (
                <EditableField
                  value={service.poblacion || ''}
                  onSave={(val) => handleFieldUpdate('poblacion', val, 'Población')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.poblacion)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Número de serie</p>
              {!isTramitacion ? (
                <EditableField
                  value={service.numeroSerie || ''}
                  onSave={(val) => handleFieldUpdate('numeroSerie', val, 'Número de serie')}
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(service.numeroSerie)}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">Fecha de instalación</p>
              {!isTramitacion ? (
                <EditableField
                  value={formatDateForInput(service.fechaInstalacion)}
                  onSave={async (val) => {
                    const date = parseDateInput(val);
                    if (date) await handleFieldUpdate('fechaInstalacion', date.toISOString(), 'Fecha de instalación');
                    else if (val === '') await handleFieldUpdate('fechaInstalacion', null, 'Fecha de instalación');
                  }}
                  placeholder="DD/MM/YYYY"
                />
              ) : (
                <p className="text-sm text-gray-900">{renderDetailValue(formatDate(service.fechaInstalacion))}</p>
              )}
            </div>
            
            {!isTramitacion && !isTecnico && !isReparacion && (
              <>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-gray-500">Código postal</p>
                  <EditableField
                    value={service.codigoPostal || ''}
                    onSave={(val) => handleFieldUpdate('codigoPostal', val, 'Código postal')}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-gray-500">Provincia</p>
                  <EditableField
                    value={service.provincia || ''}
                    onSave={(val) => handleFieldUpdate('provincia', val, 'Provincia')}
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <p className="text-xs uppercase text-gray-500">{isTramitacion ? 'Ipartner' : 'Estado'}</p>
              {!isTramitacion ? (
                <select
                  value={service.estado || ''}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    if (onStatusChange) {
                      onStatusChange(service, newVal);
                    } else {
                      handleFieldUpdate('estado', newVal, 'Estado');
                    }
                  }}
                  className={`py-1 px-3 text-xs font-semibold rounded-full border-0 appearance-none text-center ${getStatusColors(service.estado).bg} ${getStatusColors(service.estado).text}`}
                >
                  <option value="">Seleccionar...</option>
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <select
                  value={service.ipartner || ''}
                  onChange={(e) => handleFieldUpdate('ipartner', e.target.value, 'Ipartner')}
                  className={`py-1 px-3 text-xs font-semibold rounded-full border-0 appearance-none text-center ${getIpartnerColors(service.ipartner).bg} ${getIpartnerColors(service.ipartner).text}`}
                >
                  <option value="">Seleccionar...</option>
                  {IPARTNER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
            </div>
            {isTramitacion && (
              <div className="space-y-1">
                <p className="text-xs uppercase text-gray-500">Acción Ipartner</p>
                <p className="text-sm text-gray-900">{renderDetailValue(service.accionIpartner)}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Description and Comments */}
      {isReparacion ? (
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase text-gray-500 mb-2">Comentarios técnico</p>
              <p className="text-sm text-gray-900 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                {renderDetailValue(service.detalles)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-2">Comentarios</p>
              {service.comentarios && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                  <p className="text-sm text-gray-900 whitespace-pre-line">{service.comentarios}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  id="new-comment"
                  placeholder="Escribe un nuevo comentario..."
                  autoResize
                  className="flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onBlur={() => {
                    if (newComment.trim()) {
                      handleCommentAdd(newComment).then(() => setNewComment(''));
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        !isTramitacion && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {!isTecnico && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs uppercase text-gray-500">Técnico</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {service.trabajadorId && service.trabajadorId.length > 0
                      ? tecnicos.find(t => t.id === service.trabajadorId?.[0])?.nombre || 'Sin información'
                      : 'Sin información'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase text-gray-500">Cita técnico</p>
                  <p className="text-sm text-gray-900">{renderDetailValue(formatDateTime(service.citaTecnico))}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase text-gray-500 mb-2">Descripción</p>
                <p className="text-sm text-gray-900 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {renderDetailValue(service.descripcion)}
                </p>
              </div>
              {service.estado === 'Citado' && (
                <div>
                  <p className="text-xs uppercase text-gray-500 mb-2">Cita</p>
                  <EditableField
                    value={formatDateTimeForInput(service.cita)}
                    onSave={async (val) => {
                      const date = parseCitaInput(val);
                      if (date) await handleFieldUpdate('cita', date.toISOString(), 'Cita');
                    }}
                    placeholder="DD/MM/YYYY hh:mm"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-xs uppercase text-gray-500 mb-2">Comentarios</p>
              {service.comentarios && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                  <p className="text-sm text-gray-900 whitespace-pre-line">{service.comentarios}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  id="new-comment-info"
                  placeholder="Escribe un nuevo comentario..."
                  autoResize
                  className="flex-1"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onBlur={() => {
                    if (newComment.trim()) {
                      handleCommentAdd(newComment).then(() => setNewComment(''));
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
