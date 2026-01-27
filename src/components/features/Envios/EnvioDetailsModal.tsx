import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { Envio } from '../../../types';
import { StatusSelect } from '../../common/forms/StatusSelect';
import { EnvioComments } from './EnvioComments';
import { ENVIOS_STATUS_OPTIONS } from '../../../utils/constants';
import { getStatusColors } from '../../../utils/statusColors';
import { User } from '../../../contexts/AuthContext';

interface EnvioDetailsModalProps {
  envio: Envio | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, fields: Partial<Envio>) => Promise<boolean>;
  catalogos: { id: string; nombre: string; categoria?: string }[];
  serviciosInfo: any[];
  user: User | null;
}

export const EnvioDetailsModal: React.FC<EnvioDetailsModalProps> = ({
  envio,
  isOpen,
  onClose,
  onUpdate,
  catalogos,
  serviciosInfo,
  user
}) => {
  if (!envio) return null;

  const [savingField, setSavingField] = React.useState<string | null>(null);

  const handleFieldUpdate = async (field: keyof Envio, value: any) => {
    setSavingField(field);
    await onUpdate(envio.id, { [field]: value });
    setSavingField(null);
  };

  const handleAddComment = async (newComment: string) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
    
    const userName = user?.name || 'Usuario';
    const formattedComment = `${formattedDate} - ${userName}: ${newComment}`;
    
    const updatedComments = envio.comentarios 
      ? `${formattedComment}\n\n${envio.comentarios}`
      : formattedComment;
    
    await handleFieldUpdate('comentarios', updatedComments);
  };

  const servicioRelacionado = serviciosInfo.find(s => s.id === envio.servicio);

  const headerActions = (
    <div className="flex items-center gap-2">
      {envio.telefono && (
        <a
          href={`tel:${envio.telefono}`}
          className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
          title="Llamar"
        >
          <Phone className="h-5 w-5" />
        </a>
      )}
      {servicioRelacionado?.conversationId && (
        <a
          href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${servicioRelacionado.conversationId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
          title="Abrir chat"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del envío"
      size="lg"
      className="max-w-xl"
    >
      <div className="relative">
        <div className="absolute -top-16 right-0">
          {headerActions}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-gray-500">Número de envío</p>
            <p className="text-sm text-gray-900">{envio.numero || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Número de servicio</p>
            <p className="text-sm text-gray-900">{servicioRelacionado?.numero || '-'}</p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-gray-500 mb-1">Número de recogida</p>
            <input
              type="number"
              defaultValue={envio.numeroRecogida || ''}
              onBlur={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                if (val !== envio.numeroRecogida) {
                  handleFieldUpdate('numeroRecogida', val);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Introduce el número de recogida"
            />
          </div>

          <div className="flex flex-col sm:col-span-2">
            <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
            <div>
              <StatusSelect
                value={envio.estado || ''}
                options={ENVIOS_STATUS_OPTIONS}
                onChange={(val) => handleFieldUpdate('estado', val)}
                className="inline-block"
              />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Destinatario</p>
            <input
              type="text"
              defaultValue={envio.cliente || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.cliente) {
                  handleFieldUpdate('cliente', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Nombre del destinatario"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Teléfono</p>
            <input
              type="tel"
              defaultValue={envio.telefono || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.telefono) {
                  handleFieldUpdate('telefono', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Teléfono"
            />
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-gray-500">Dirección</p>
            <input
              type="text"
              defaultValue={envio.direccion || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.direccion) {
                  handleFieldUpdate('direccion', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Dirección completa"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Ciudad</p>
            <input
              type="text"
              defaultValue={envio.poblacion || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.poblacion) {
                  handleFieldUpdate('poblacion', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Ciudad"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Código postal</p>
            <input
              type="text"
              defaultValue={envio.codigoPostal || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.codigoPostal) {
                  handleFieldUpdate('codigoPostal', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Código postal"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Provincia</p>
            <input
              type="text"
              defaultValue={envio.provincia || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.provincia) {
                  handleFieldUpdate('provincia', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Provincia"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Referencia</p>
            <input
              type="text"
              defaultValue={envio.referencia || ''}
              onBlur={(e) => {
                if (e.target.value !== envio.referencia) {
                  handleFieldUpdate('referencia', e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Referencia"
            />
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500">Bultos</p>
            <input
              type="number"
              defaultValue={envio.bultos || ''}
              onBlur={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                if (val !== envio.bultos) {
                  handleFieldUpdate('bultos', val);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              placeholder="Número de bultos"
            />
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs uppercase text-gray-500">ID producto</p>
            <p className="text-sm text-gray-900 py-2">{envio.idProducto || '-'}</p>
          </div>

          <div className="flex flex-col sm:col-span-2">
            <p className="text-xs uppercase text-gray-500 mb-1">Producto / Catálogo</p>
            <div>
              <select
                defaultValue={envio.catalogo || ''}
                onChange={(e) => handleFieldUpdate('catalogo', e.target.value)}
                className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center inline-block ${getStatusColors('Producto').bg} ${getStatusColors('Producto').text}`}
                style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '120px' }}
              >
                <option value="">Seleccionar producto</option>
                {catalogos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:col-span-2">
            <p className="text-xs uppercase text-gray-500 mb-1">Transporte</p>
            <div>
              <select
                defaultValue={envio.transporte || ''}
                onChange={(e) => handleFieldUpdate('transporte', e.target.value)}
                className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center inline-block ${getStatusColors('Transporte').bg} ${getStatusColors('Transporte').text}`}
                style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '120px' }}
              >
                <option value="">Seleccionar transporte</option>
                <option value="Inbound Logística">Inbound Logística</option>
                <option value="Revalco">Revalco</option>
                <option value="Saltoki">Saltoki</option>
                <option value="Packlink">Packlink</option>
                <option value="Tipsa">Tipsa</option>
              </select>
            </div>
          </div>

          <EnvioComments
            comentarios={envio.comentarios}
            onAddComment={handleAddComment}
            isSaving={savingField === 'comentarios'}
            user={user}
          />
        </div>
      </div>
    </Modal>
  );
};
