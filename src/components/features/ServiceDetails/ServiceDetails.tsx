import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { Service, AirtableAttachment } from '../../../types';
import { formatDate, formatDateTime, formatDateTimeForInput, renderDetailValue, parseCitaInput } from '../../../utils/helpers';
import { getStatusColors, getIpartnerColors } from '../../../utils/statusColors';
import { STATUS_OPTIONS, IPARTNER_OPTIONS } from '../../../utils/constants';
import { EditableField } from '../../ui/EditableField';
import { Textarea } from '../../ui/Textarea';
import { Badge } from '../../ui/Badge';
import { airtableService } from '../../../services/airtable';
import { supabaseService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useFormularios } from '../../../hooks/useFormularios';

interface ServiceDetailsProps {
  service: Service;
  variant?: 'servicios' | 'tramitaciones' | 'reparaciones';
  onUpdate: (updatedService: Service) => void;
  onStatusChange?: (service: Service, newStatus: string) => void;
  onClose: () => void;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({
  service: initialService,
  variant = 'servicios',
  onUpdate,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const isTramitacion = variant === 'tramitaciones';
  const isReparacion = variant === 'reparaciones';
  const isTecnico = user?.role === 'Técnico';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';

  const [service, setService] = useState<Service>(initialService);
  const [detailsView, setDetailsView] = useState<'detalles' | 'formulario' | 'reparaciones' | 'fotos' | 'historial'>('detalles');
  const [historialServicios, setHistorialServicios] = useState<Service[]>([]);
  const [reparaciones, setReparaciones] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedReparacionIndex, setSelectedReparacionIndex] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const tableName = isReparacion ? 'Reparaciones' : undefined;

  const {
    formularios,
    fallbackFormulario,
    loadFormularios,
  } = useFormularios();

  const [selectedFormularioIndex, setSelectedFormularioIndex] = useState(0);

  useEffect(() => {
    setService(initialService);
    loadFormularios({
      formularioIds: initialService.formularioId,
      expediente: initialService.expediente,
      direccion: initialService.direccion,
      nombre: initialService.nombre,
      isTramitacion,
    });
    
    if (initialService.reparacionesId && initialService.reparacionesId.length > 0) {
      airtableService.getReparacionesByIds(initialService.reparacionesId)
        .then(setReparaciones)
        .catch(console.error);
    }

    airtableService.getTechnicians()
      .then(data => setTecnicos(data.filter(t => t.nombre !== undefined) as { id: string; nombre: string; }[]))
      .catch(console.error);
  }, [initialService, isTramitacion, loadFormularios]);

  const handleFieldUpdate = async (field: string, value: any, airtableField?: string) => {
    try {
      await airtableService.updateServiceField(service.id, airtableField || field, value, tableName);
      
      // Sync with Supabase if updating Ipartner
      if ((airtableField === 'Ipartner' || field === 'ipartner') && value) {
        if (service.numero) {
          await supabaseService.completeTramitacion(service.numero);
        }
      }

      const updatedService: Service = { ...service, [field.toLowerCase()]: value };
      if (airtableField === 'Ipartner' || field === 'ipartner') {
        updatedService.tramitado = true;
      }
      setService(updatedService);
      onUpdate(updatedService);
    } catch (error) {
      alert('Error al actualizar el campo');
    }
  };

  const handleCommentAdd = async (comment: string) => {
    if (!comment.trim()) return;
    try {
      const now = new Date();
      const formattedDate = formatDate(now.toISOString()) + ' ' + now.getHours() + ':' + now.getMinutes();
      const userName = user?.name || 'Usuario';
      const formattedComment = `${formattedDate} - ${userName}: ${comment}`;
      const updatedComments = service.comentarios 
        ? `${formattedComment}\n\n${service.comentarios}`
        : formattedComment;

      await airtableService.updateServiceField(service.id, 'Comentarios', updatedComments, tableName);
      const updatedService = { ...service, comentarios: updatedComments };
      setService(updatedService);
      onUpdate(updatedService);
    } catch (error) {
      alert('Error al guardar el comentario');
    }
  };

  const handlePhotoUpload = async (formId: string, field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(field);
    try {
      const airtableFieldName = field === 'fotoGeneral' ? 'Foto general' : 
                               field === 'fotoEtiqueta' ? 'Foto etiqueta' :
                               field === 'fotoRoto' ? 'Foto roto' : 'Foto cuadro';
      
      await airtableService.uploadFormularioPhoto(formId, airtableFieldName, file);
      await loadFormularios({
        formularioIds: service.formularioId,
        expediente: service.expediente,
        direccion: service.direccion,
        nombre: service.nombre,
        isTramitacion,
      });
    } catch (error) {
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const hasFormularioPhotos = (form: any) => {
    if (!form) return false;
    const photoFields = ['Foto general', 'Foto etiqueta', 'Foto roto', 'Foto cuadro'];
    return photoFields.some((field) => Array.isArray(form[field]) && form[field].length > 0);
  };

  const normalizeAttachments = (value: any): AirtableAttachment[] => (
    Array.isArray(value) ? value : []
  );

  const reparacionPhotos = reparaciones.flatMap((reparacion) => ([
    ...normalizeAttachments(reparacion['Foto'] ?? reparacion.foto ?? reparacion.fotoGeneral),
    ...normalizeAttachments(reparacion['Foto de la etiqueta'] ?? reparacion.fotoEtiqueta),
  ]));
  const hasReparacionPhotos = reparacionPhotos.length > 0;

  const currentForm = formularios[selectedFormularioIndex] || (detailsView === 'fotos' ? fallbackFormulario : null);
  const photoForm = (() => {
    const primaryForm = formularios[selectedFormularioIndex];
    if (primaryForm && hasFormularioPhotos(primaryForm)) return primaryForm;
    if (!hasReparacionPhotos && fallbackFormulario) return fallbackFormulario;
    return primaryForm || null;
  })();

  const formularioPhotos = photoForm
    ? [
        ...normalizeAttachments(photoForm['Foto general']),
        ...normalizeAttachments(photoForm['Foto etiqueta']),
        ...normalizeAttachments(photoForm['Foto roto']),
        ...normalizeAttachments(photoForm['Foto cuadro']),
      ]
    : [];

  const mixedPhotos = [...formularioPhotos, ...reparacionPhotos];

  return (
    <div className="space-y-4 -mt-4">
      {/* Tabs and Actions */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${detailsView === 'detalles' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setDetailsView('detalles')}
          >
            Detalles
          </button>
          {!isTramitacion && (
            <>
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${detailsView === 'formulario' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setDetailsView('formulario')}
              >
                Formulario
              </button>
              {!isGestoraTecnica && (
                <button
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${detailsView === 'reparaciones' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setDetailsView('reparaciones')}
                >
                  Reparaciones
                </button>
              )}
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${detailsView === 'historial' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={async () => {
                setDetailsView('historial');
                  if (service.telefono) {
                    const allServices = await airtableService.getServices(user?.clinic);
                    const historial = allServices.filter(s => s.telefono === service.telefono && s.id !== service.id);
                    setHistorialServicios(historial as unknown as Service[]);
                  }
                }}
              >
                Historial
              </button>
            </>
          )}
          {isTramitacion && (
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${detailsView === 'fotos' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setDetailsView('fotos')}
            >
              Fotos
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {service.telefono && (
            <a
              href={`tel:${service.telefono}`}
              className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
              title="Llamar"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
          {service.conversationId && (
            <a
              href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${service.conversationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
              title="Abrir chat"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>

      {/* View Content */}
      <div className="mt-6">
        {detailsView === 'detalles' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Detalle del servicio</h2>
              <p className="text-sm text-gray-500 mt-1">
                {isTramitacion 
                  ? `Número: ${service.numero || '-'} | Expediente: ${service.expediente || '-'}`
                  : `Número ${service.numero || service.expediente || 'sin número asignado'}`
                }
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                {!isTramitacion ? (
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
              
              {!isTramitacion && !isTecnico && (
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
                <p className="text-xs uppercase text-gray-500">Estado</p>
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
            </div>

            {/* Description and Comments */}
            {!isTramitacion && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                {/* Técnico and Cita Técnico */}
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
            )}
          </div>
        )}

        {/* Other views would follow here... */}
        {detailsView === 'formulario' && currentForm && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Formulario</h2>
              {formularios.length > 1 && (
                <select
                  value={selectedFormularioIndex}
                  onChange={(e) => setSelectedFormularioIndex(parseInt(e.target.value))}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  {formularios.map((_, i) => <option key={i} value={i}>Formulario {i+1}</option>)}
                </select>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-1">
                 <p className="text-xs font-semibold text-gray-700 uppercase">Detalles</p>
                 <EditableField
                   value={currentForm.Detalles || ''}
                   type="textarea"
                   onSave={async (val) => {
                     await airtableService.updateFormularioField(currentForm.id, 'Detalles', val);
                     loadFormularios({ formularioIds: service.formularioId, expediente: service.expediente, isTramitacion });
                   }}
                 />
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-semibold text-gray-700 uppercase">Potencia contratada</p>
                 <EditableField
                   value={currentForm['Potencia contratada'] || ''}
                   onSave={async (val) => {
                     await airtableService.updateFormularioField(currentForm.id, 'Potencia contratada', val);
                     loadFormularios({ formularioIds: service.formularioId, expediente: service.expediente, isTramitacion });
                   }}
                 />
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-semibold text-gray-700 uppercase">Fecha instalación</p>
                 <EditableField
                   value={currentForm['Fecha instalación'] || ''}
                   type="date"
                   onSave={async (val) => {
                     await airtableService.updateFormularioField(currentForm.id, 'Fecha instalación', val);
                     loadFormularios({ formularioIds: service.formularioId, expediente: service.expediente, isTramitacion });
                   }}
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
                   { id: 'fotoCuadro', label: 'Foto cuadro', field: 'Foto cuadro' }
                 ].map(photoConfig => (
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
        )}
        
        {detailsView === 'reparaciones' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Reparaciones</h2>
              {reparaciones.length > 1 && (
                <select
                  value={selectedReparacionIndex}
                  onChange={(e) => setSelectedReparacionIndex(parseInt(e.target.value))}
                  className="px-3 py-1 border rounded-lg text-sm"
                >
                  {reparaciones.map((_, i) => <option key={i} value={i}>Reparación {i+1}</option>)}
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
                    <p className="text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(reparaciones[selectedReparacionIndex].Detalles)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700 uppercase">Comentarios</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{renderDetailValue(reparaciones[selectedReparacionIndex].Comentarios)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-700 uppercase">Cita técnico</p>
                    <p className="text-sm text-gray-900">{formatDateTime(reparaciones[selectedReparacionIndex]['Cita técnico'])}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {detailsView === 'historial' && (
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
        )}

        {detailsView === 'fotos' && (
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
        )}
      </div>
    </div>
  );
};
