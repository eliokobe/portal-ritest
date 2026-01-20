import React, { useState } from 'react';
import { X, Phone, FileText } from 'lucide-react';
import { Registro } from '../../../types';
import { Modal } from '../../common/Modal';
import { StatusSelect } from '../../common/forms/StatusSelect';
import { formatDateTime, formatDateTimeForInput, formatCitaInputWithAutoFormat } from '../../../utils/dateUtils';

interface RegistroDetailsProps {
  registro: Registro;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
  onUpdateIpartner: (id: string, value: string) => Promise<boolean>;
  onUpdateCita: (id: string, cita: string) => Promise<boolean>;
  onUpdateComentarios: (id: string, comentarios: string) => Promise<boolean>;
  savingStatus: boolean;
  savingCita: boolean;
  savingComentarios: boolean;
  statusOptions: string[];
  ipartnerOptions: string[];
  userName?: string;
}

export const RegistroDetails: React.FC<RegistroDetailsProps> = ({
  registro,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateIpartner,
  onUpdateCita,
  onUpdateComentarios,
  savingStatus,
  savingCita,
  savingComentarios,
  statusOptions,
  ipartnerOptions,
  userName = 'Usuario',
}) => {
  const [editingCita, setEditingCita] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

    const formattedComment = `${formattedDate} - ${userName}: ${newComment.trim()}`;
    const updatedComments = registro.comentarios
      ? `${formattedComment}\n\n${registro.comentarios}`
      : formattedComment;

    if (await onUpdateComentarios(registro.id, updatedComments)) {
      setNewComment('');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del Registro"
      size="md"
      header={
        <div className="flex items-center gap-2">
          {registro.telefono && (
            <a
              href={`tel:${registro.telefono}`}
              className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
              title="Llamar"
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={() => {
              const asesor = registro.asesor || '';
              const contrato = registro.contrato || '';
              const url = `https://ritest.fillout.com/asesoramiento?asesor=${encodeURIComponent(asesor)}&contrato=${encodeURIComponent(contrato)}`;
              window.open(url, '_blank');
            }}
            className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
            title="Abrir formulario de asesoramiento"
          >
            <FileText className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DetailItem label="Contrato" value={registro.contrato?.toString()} />
          <DetailItem label="Expediente" value={registro.expediente} />
          <DetailItem label="Nombre" value={registro.nombre} />
          <DetailItem label="Teléfono" value={registro.telefono} />
          <DetailItem label="Dirección" value={registro.direccion} />
          <DetailItem label="Email" value={registro.email} />
          
          <div className="flex flex-col">
            <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
            <StatusSelect
              value={registro.estado || ''}
              options={statusOptions}
              onChange={(val) => onUpdateStatus(registro.id, val)}
              disabled={savingStatus}
              className="inline-block"
            />
          </div>

          <div className="flex flex-col">
            <p className="text-xs uppercase text-gray-500 mb-1">Ipartner</p>
            <StatusSelect
              value={registro.ipartner || ''}
              options={ipartnerOptions}
              onChange={(val) => onUpdateIpartner(registro.id, val)}
              className="inline-block"
            />
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase text-gray-500 mb-2">PDF</h3>
          {registro.pdf && registro.pdf.length > 0 ? (
            <div className="space-y-2">
              {registro.pdf.map((file) => (
                <a
                  key={file.id}
                  href={file.url}
                  download={file.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-blue-600 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span className="truncate flex-1">{file.filename}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size || 0) > 1024 ? ((file.size || 0) / 1024).toFixed(1) + ' KB' : (file.size || 0) + ' B'})
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin PDF adjunto</p>
          )}
        </div>

        <div>
          <h3 className="text-xs uppercase text-gray-500 mb-1">Cita</h3>
          {editingCita ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="DD/MM/YYYY hh:mm"
                defaultValue={formatDateTimeForInput(registro.cita)}
                onChange={formatCitaInputWithAutoFormat}
                onBlur={async (e) => {
                  const val = e.target.value;
                  if (val && val.length === 16) {
                    if (await onUpdateCita(registro.id, val)) {
                      setEditingCita(false);
                    }
                  } else if (!val) {
                    setEditingCita(false);
                  }
                }}
                maxLength={16}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCita(false)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="text-sm text-gray-900 mt-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
              onClick={() => setEditingCita(true)}
            >
              {formatDateTime(registro.cita)}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Comentarios</h3>
          {registro.comentarios && (
            <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-900 whitespace-pre-line">{registro.comentarios}</p>
            </div>
          )}
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un nuevo comentario..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
              rows={3}
              disabled={savingComentarios}
            />
            <button
              onClick={handleAddComment}
              disabled={savingComentarios || !newComment.trim()}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {savingComentarios ? 'Guardando...' : 'Agregar Comentario'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const DetailItem = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <h3 className="text-xs uppercase text-gray-500">{label}</h3>
    <p className="text-sm text-gray-900 mt-1">{value || '-'}</p>
  </div>
);
