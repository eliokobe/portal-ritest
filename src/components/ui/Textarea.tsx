import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoResize?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  autoResize = false,
  className = '',
  id,
  onChange,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const performResize = React.useCallback(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [autoResize]);

  React.useEffect(() => {
    // Initial resize after a short delay to ensure layout is ready
    const timer = setTimeout(performResize, 0);
    return () => clearTimeout(timer);
  }, [performResize, props.value, props.defaultValue]);

  const handleResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    performResize();
    if (onChange) onChange(e);
  };

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-gray-700 uppercase">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={textareaRef}
        onChange={handleResize}
        data-autosize={autoResize ? 'true' : undefined}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm transition-shadow disabled:bg-gray-50 disabled:text-gray-500 resize-none ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
