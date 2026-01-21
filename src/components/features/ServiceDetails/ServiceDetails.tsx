import React, { useState, useEffect } from 'react';
import { Service, AirtableAttachment } from '../../../types';
import { formatDate } from '../../../utils/helpers';
import { airtableService } from '../../../services/airtable';
import { supabaseService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useFormularios } from '../../../hooks/useFormularios';

// New subcomponents
import { ServiceDetailsHeader } from './ServiceDetailsHeader';
import { ServiceInfoView } from './ServiceInfoView';
import { ServiceFormView } from './ServiceFormView';
import { ServiceReparacionesView } from './ServiceReparacionesView';
import { ServiceHistorialView } from './ServiceHistorialView';
import { ServicePhotosView } from './ServicePhotosView';

interface ServiceDetailsProps {
  service: Service;
  variant?: 'servicios' | 'tramitaciones' | 'reparaciones';
  onUpdate: (updatedService: Service) => void;
  onStatusChange?: (service: Service, newStatus: string) => void;
  onClose: () => void;
  technicianName?: string;
}

export const ServiceDetails: React.FC<ServiceDetailsProps> = ({
  service: initialService,
  variant = 'servicios',
  onUpdate,
  onStatusChange,
  technicianName,
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
  const [selectedFormularioIndex, setSelectedFormularioIndex] = useState(0);

  const tableName = isReparacion ? 'Reparaciones' : undefined;

  const {
    formularios,
    fallbackFormulario,
    loadFormularios,
  } = useFormularios();

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
      const isIpartner = airtableField === 'Ipartner' || field === 'ipartner';
      
      if (isIpartner) {
        // Si se actualiza Ipartner, también marcamos como Tramitado en Airtable
        await airtableService.updateServiceFields(service.id, { 
          'Ipartner': value, 
          'Tramitado': true 
        }, tableName);
      } else {
        await airtableService.updateServiceField(service.id, airtableField || field, value, tableName);
      }
      
      // Sync with Supabase if updating Ipartner
      if (isIpartner && value) {
        if (service.numero) {
          await supabaseService.completeTramitacion(service.numero);
        }
      }

      const updatedService: Service = { ...service, [field.toLowerCase()]: value };
      if (isIpartner) {
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

  const onLoadHistorial = async () => {
    setDetailsView('historial');
    if (service.telefono) {
      const allServices = await airtableService.getServices(user?.clinic);
      const historial = allServices.filter(s => s.telefono === service.telefono && s.id !== service.id);
      setHistorialServicios(historial as unknown as Service[]);
    }
  };

  const normalizeAttachments = (value: any): AirtableAttachment[] => (
    Array.isArray(value) ? value : []
  );

  const reparacionPhotos = reparaciones.flatMap((reparacion) => ([
    ...normalizeAttachments(reparacion['Foto'] ?? reparacion.foto ?? reparacion.fotoGeneral),
    ...normalizeAttachments(reparacion['Foto de la etiqueta'] ?? reparacion.fotoEtiqueta),
  ]));

  const photoForm = (() => {
    const primaryForm = formularios[selectedFormularioIndex];
    const photoFields = ['Foto general', 'Foto etiqueta', 'Foto roto', 'Foto cuadro'];
    const hasFormularioPhotos = (form: any) => form && photoFields.some((f) => Array.isArray(form[f]) && form[f].length > 0);
    
    if (primaryForm && hasFormularioPhotos(primaryForm)) return primaryForm;
    const hasReparacionPhotos = reparacionPhotos.length > 0;
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
      <ServiceDetailsHeader
        detailsView={detailsView}
        setDetailsView={setDetailsView}
        isTramitacion={isTramitacion}
        isReparacion={isReparacion}
        isGestoraTecnica={isGestoraTecnica}
        service={service}
        onLoadHistorial={onLoadHistorial}
      />

      <div className={isReparacion ? "" : "mt-6"}>
        {detailsView === 'detalles' && (
          <ServiceInfoView
            service={service}
            isReparacion={isReparacion}
            isTramitacion={isTramitacion}
            isTecnico={isTecnico}
            isGestoraTecnica={isGestoraTecnica}
            technicianName={technicianName}
            tecnicos={tecnicos}
            onStatusChange={onStatusChange}
            handleFieldUpdate={handleFieldUpdate}
            newComment={newComment}
            setNewComment={setNewComment}
            handleCommentAdd={handleCommentAdd}
          />
        )}

        {detailsView === 'formulario' && (
          <ServiceFormView
            service={service}
            formularios={formularios}
            selectedFormularioIndex={selectedFormularioIndex}
            setSelectedFormularioIndex={setSelectedFormularioIndex}
            isTramitacion={isTramitacion}
            loadFormularios={loadFormularios}
            uploadingPhoto={uploadingPhoto}
            handlePhotoUpload={handlePhotoUpload}
          />
        )}
        
        {detailsView === 'reparaciones' && (
          <ServiceReparacionesView
            reparaciones={reparaciones}
            selectedReparacionIndex={selectedReparacionIndex}
            setSelectedReparacionIndex={setSelectedReparacionIndex}
          />
        )}

        {detailsView === 'historial' && (
          <ServiceHistorialView historialServicios={historialServicios} />
        )}

        {detailsView === 'fotos' && (
          <ServicePhotosView mixedPhotos={mixedPhotos} />
        )}
      </div>
    </div>
  );
};
