import React from 'react';
import { getStatusColors } from '../../../utils/statusColors';

interface StatusSelectProps {
  value: string;
  onChange: (newValue: string) => void;
  options: string[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  placeholder = 'Seleccionar...',
}) => {
  const colors = getStatusColors(value);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${colors.bg} ${colors.text} ${className}`}
      style={{
        appearance: 'none',
        backgroundImage: 'none',
        width: `${(value || placeholder).length + 4}ch`,
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
};
