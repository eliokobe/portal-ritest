import React from 'react';
import { ExternalLink } from 'lucide-react';
import { DataTable, Column } from '../../common/DataTable';
import { Envio } from '../../../types';
import { StatusSelect } from '../../common/forms/StatusSelect';
import { ENVIOS_STATUS_OPTIONS, ENVIOS_SEGUIMIENTO_OPTIONS } from '../../../utils/constants';

interface EnvioTableProps {
  envios: Envio[];
  loading: boolean;
  onViewDetails: (envio: Envio) => void;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onUpdateSeguimiento: (id: string, newSeguimiento: string) => Promise<void>;
  onUpdateFechaEnvio: (id: string, newDate: string) => Promise<void>;
  servicios: { id: string; nombre?: string }[];
}

const TRACKING_BASE = 'https://app.cttexpress.com/Forms/Destinatarios.aspx?c=00828000964&r=IL88P';

export const EnvioTable: React.FC<EnvioTableProps> = ({
  envios,
  loading,
  onViewDetails,
  onUpdateStatus,
  onUpdateSeguimiento,
  onUpdateFechaEnvio,
  servicios
}) => {
  const [editingFecha, setEditingFecha] = React.useState<{ id: string; value: string } | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const columns: Column<Envio>[] = [
    {
      header: 'Seguimiento',
      accessor: (envio: Envio) => {
        const estadosRecogida = ['Pendiente recogida', 'Recogida enviada', 'Recogida hecha'];
        const usarCttExpress = estadosRecogida.includes(envio.estado || '');
        
        const trackingUrl = usarCttExpress 
          ? 'https://www.cttexpress.com/localizador-de-envios/'
          : (envio.seguimiento || (envio.numero ? `${TRACKING_BASE}${envio.numero}` : undefined));
        
        if (!trackingUrl) return '-';
        return (
          <div className="flex flex-col">
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary/80"
              onClick={(e) => e.stopPropagation()}
            >
              Ver seguimiento
              <ExternalLink className="h-4 w-4" />
            </a>
            {envio.numero && (
              <span className="text-xs text-gray-500">Nº {envio.numero}</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Servicio',
      accessor: (envio: Envio) => servicios.find(s => s.id === envio.servicio)?.nombre || '-'
    },
    {
      header: 'Estado',
      accessor: (envio: Envio) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={envio.estado || ''}
            options={ENVIOS_STATUS_OPTIONS}
            onChange={(val) => onUpdateStatus(envio.id, val)}
          />
        </div>
      )
    },
    {
      header: 'Fecha de Envío',
      accessor: (envio: Envio) => {
        const isEditing = editingFecha?.id === envio.id;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {isEditing ? (
              <input
                type="date"
                value={editingFecha.value}
                onChange={(e) => setEditingFecha({ ...editingFecha, value: e.target.value })}
                onBlur={async () => {
                  if (editingFecha.value !== envio.fechaEnvio) {
                    await onUpdateFechaEnvio(envio.id, editingFecha.value);
                  }
                  setEditingFecha(null);
                }}
                autoFocus
                className="border rounded px-2 py-1 text-sm"
              />
            ) : (
              <span
                onClick={() => setEditingFecha({ id: envio.id, value: envio.fechaEnvio || '' })}
                className="cursor-pointer hover:underline"
              >
                {formatDate(envio.fechaEnvio)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Producto',
      accessor: 'producto'
    },
    {
      header: 'Comentarios',
      accessor: (envio: Envio) => (
        <span className="block max-w-xs truncate" title={envio.comentarios || ''}>
          {envio.comentarios || '-'}
        </span>
      ),
      className: 'max-w-xs'
    },
    {
      header: 'Seguimiento',
      accessor: (envio: Envio) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            value={envio.seguimiento || ''}
            options={ENVIOS_SEGUIMIENTO_OPTIONS}
            onChange={(val) => onUpdateSeguimiento(envio.id, val)}
            className="bg-white text-gray-700 border border-gray-300"
          />
        </div>
      )
    },
    {
      header: 'Detalles',
      align: 'right',
      accessor: (envio: Envio) => (
        <button
          onClick={() => onViewDetails(envio)}
          className="text-brand-primary hover:text-brand-primary/80 font-medium"
        >
          Ver detalles
        </button>
      )
    }
  ];

  return (
    <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 overflow-hidden">
      <DataTable
        columns={columns}
        data={envios}
        isLoading={loading}
        emptyMessage="No se encontraron envíos"
      />
    </div>
  );
};
