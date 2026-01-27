import React from 'react';
import { DataTable, Column } from '../../common/DataTable';
import { Envio } from '../../../types';
import { StatusSelect } from '../../common/forms/StatusSelect';
import { ENVIOS_STATUS_OPTIONS } from '../../../utils/constants';

interface EnvioTableProps {
  envios: Envio[];
  loading: boolean;
  onViewDetails: (envio: Envio) => void;
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  onUpdateSeguimiento: (id: string, newSeguimiento: string) => Promise<void>;
  onUpdateFechaEnvio: (id: string, newDate: string) => Promise<void>;
  servicios: { id: string; nombre?: string }[];
}

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
      header: 'Número',
      accessor: (envio: Envio) => envio.numero || '-'
    },
    {
      header: 'Destinatario',
      accessor: (envio: Envio) => envio.cliente || '-',
      className: 'min-w-[200px]'
    },
    {
      header: 'Provincia',
      accessor: (envio: Envio) => envio.provincia || '-'
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
    }
  ];

  return (
    <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 overflow-hidden">
      <DataTable
        columns={columns}
        data={envios}
        isLoading={loading}
        emptyMessage="No se encontraron envíos"
        onRowClick={onViewDetails}
      />
    </div>
  );
};
