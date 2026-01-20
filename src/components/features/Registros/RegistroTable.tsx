import React from 'react';
import { User } from 'lucide-react';
import { Registro } from '../../../types';
import { DataTable, Column } from '../../common/DataTable';
import { StatusSelect } from '../../common/forms/StatusSelect';

interface RegistroTableProps {
  registros: Registro[];
  loading: boolean;
  onViewDetails: (registro: Registro) => void;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
  onUpdateIpartner: (id: string, value: string) => Promise<boolean>;
  statusOptions: string[];
  ipartnerOptions: string[];
  savingStatus: boolean;
}

export const RegistroTable: React.FC<RegistroTableProps> = ({
  registros,
  loading,
  onViewDetails,
  onUpdateStatus,
  onUpdateIpartner,
  statusOptions,
  ipartnerOptions,
  savingStatus,
}) => {
  const columns: Column<Registro>[] = [
    {
      header: 'Contrato',
      accessor: (r) => r.contrato || '-',
      className: 'font-medium',
    },
    {
      header: 'Nombre',
      accessor: (r) => (
        <div className="max-w-[12rem] truncate" title={r.nombre}>
          {r.nombre || '-'}
        </div>
      ),
    },
    {
      header: 'Teléfono',
      accessor: 'telefono',
    },
    {
      header: 'Dirección',
      accessor: (r) => (
        <div className="max-w-[12rem] truncate" title={r.direccion}>
          {r.direccion || '-'}
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: (r) => (
        <StatusSelect
          value={r.estado || ''}
          options={statusOptions}
          onChange={(val) => onUpdateStatus(r.id, val)}
          disabled={savingStatus}
        />
      ),
    },
    {
      header: 'Ipartner',
      accessor: (r) => (
        <StatusSelect
          value={r.ipartner || ''}
          options={ipartnerOptions}
          onChange={(val) => onUpdateIpartner(r.id, val)}
        />
      ),
    },
    {
      header: 'Detalles',
      align: 'center',
      accessor: (r) => (
        <button
          onClick={() => onViewDetails(r)}
          className="text-brand-primary hover:text-brand-primary/80 font-medium"
        >
          Ver detalles
        </button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={registros}
      isLoading={loading}
      emptyMessage="No se encontraron registros"
    />
  );
};
