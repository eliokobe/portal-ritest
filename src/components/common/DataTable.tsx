import React, { useMemo } from 'react';
import { Info } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowIdField?: keyof T;
  selectedRowId?: string;
  rowClassName?: string | ((item: T) => string);
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  isLoading,
  emptyMessage = 'No hay datos para mostrar en este momento.',
  rowIdField = 'id' as keyof T,
  selectedRowId,
  rowClassName = '',
}: DataTableProps<T>) {
  const alignmentStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const tableContent = useMemo(() => {
    if (isLoading) {
      return (
        <tr className="animate-pulse">
          <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
            Cargando datos...
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length} className="px-4 py-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <Info className="h-10 w-10 text-gray-400 mb-4" />
              <p className="text-gray-500">{emptyMessage}</p>
            </div>
          </td>
        </tr>
      );
    }

    return data.map((item, index) => {
      const id = (item[rowIdField] as unknown as string) || index.toString();
      const isSelected = selectedRowId === id;
      const customRowClass = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName;

      return (
        <tr
          key={id}
          id={`row-${id}`}
          onClick={() => onRowClick?.(item)}
          className={`${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-green-50' : 'hover:bg-gray-50'} ${customRowClass} transition-colors border-b border-gray-200 last:border-0`}
        >
          {columns.map((column, colIndex) => {
            const align = column.align || 'left';
            const content = typeof column.accessor === 'function' 
              ? column.accessor(item) 
              : (item[column.accessor] as unknown as React.ReactNode);

            return (
              <td
                key={`${id}-${colIndex}`}
                className={`px-4 py-3 text-sm text-gray-900 ${alignmentStyles[align]} ${column.className || ''}`}
              >
                {content ?? '-'}
              </td>
            );
          })}
        </tr>
      );
    });
  }, [data, columns, isLoading, emptyMessage, onRowClick, rowIdField, rowClassName]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    alignmentStyles[column.align || 'left']
                  } ${column.headerClassName || ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableContent}
          </tbody>
        </table>
      </div>
    </div>
  );
}
