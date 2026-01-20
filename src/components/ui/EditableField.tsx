import React, { useState, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';

interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: 'text' | 'textarea' | 'select' | 'tel' | 'number' | 'date';
  options?: string[];
  placeholder?: string;
  className?: string;
  renderValue?: (value: string) => React.ReactNode;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = 'Haga clic para editar',
  className = '',
  renderValue,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(currentValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {type === 'textarea' ? (
          <Textarea
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            autoResize
            disabled={isSaving}
          />
        ) : type === 'select' ? (
          <select
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
            disabled={isSaving}
            autoFocus
          >
            <option value="">Seleccionar...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={type}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            disabled={isSaving}
          />
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="success"
            onClick={handleSave}
            isLoading={isSaving}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded transition-colors ${className}`}
      onClick={() => setIsEditing(true)}
    >
      <div className="flex-1 overflow-hidden">
        {renderValue ? (
          renderValue(value)
        ) : (
          <span className={`text-sm ${!value ? 'text-gray-400 italic' : 'text-gray-900'}`}>
            {value || placeholder}
          </span>
        )}
      </div>
      <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};
