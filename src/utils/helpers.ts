/**
 * Formatea una fecha en formato ISO a DD/MM/YYYY
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

/**
 * Formatea una fecha para ser usada en un input (DD/MM/YYYY)
 */
export const formatDateForInput = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

/**
 * Parsea un string de fecha (DD/MM/YYYY) a un objeto Date
 */
export const parseDateInput = (input: string): Date | null => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = input.trim().match(regex);
  
  if (!match) return null;

  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;

  try {
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (date.getDate() !== dayNum || 
        date.getMonth() !== monthNum - 1 || 
        date.getFullYear() !== yearNum) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};

/**
 * Formatea una fecha en formato ISO a DD/MM/YYYY HH:MM
 */
export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

/**
 * Formatea una fecha para ser usada en un input (DD/MM/YYYY HH:MM)
 */
export const formatDateTimeForInput = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

/**
 * Parsea un string de fecha (DD/MM/YYYY HH:MM) a un objeto Date
 */
export const parseCitaInput = (input: string): Date | null => {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})$/;
  const match = input.trim().match(regex);
  
  if (!match) return null;

  const [, day, month, year, hours, minutes] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  const hoursNum = parseInt(hours);
  const minutesNum = parseInt(minutes);

  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (hoursNum < 0 || hoursNum > 23) return null;
  if (minutesNum < 0 || minutesNum > 59) return null;

  try {
    const date = new Date(yearNum, monthNum - 1, dayNum, hoursNum, minutesNum);
    if (date.getDate() !== dayNum || 
        date.getMonth() !== monthNum - 1 || 
        date.getFullYear() !== yearNum ||
        date.getHours() !== hoursNum ||
        date.getMinutes() !== minutesNum) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
};

/**
 * Formatea automáticamente un input de cita mientras el usuario escribe
 */
export const formatCitaInputWithAutoFormat = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length <= 10) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
};

/**
 * Función para renderizar un valor o 'Sin información' si está vacío
 */
export const renderDetailValue = (value?: any): string => {
  if (value === null || value === undefined) return 'Sin información';
  const cleaned = value.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};
