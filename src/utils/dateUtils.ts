export const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    // Airtable devuelve ISO UTC, convertimos a hora local Europe/Madrid
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid'
    });
  } catch {
    return '-';
  }
};

// Convierte de ISO UTC a formato datetime-local para el input
export const convertLocalInputToISO = (localDateTime: string): string => {
  if (!localDateTime) return '';
  try {
    const date = new Date(localDateTime);
    return date.toISOString();
  } catch {
    return localDateTime;
  }
};

// Formatea entrada DD/MM/YYYY hh:mm a ISO para airtable
export const formatCitaInputWithAutoFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Solo permitir números
  let input = e.target.value.replace(/\D/g, '');
  
  // Auto-formatear a DD/MM/YYYY hh:mm
  if (input.length > 0) {
    if (input.length <= 2) {
      e.target.value = input;
    }
    else if (input.length <= 4) {
      e.target.value = input.slice(0, 2) + '/' + input.slice(2);
    }
    else if (input.length <= 8) {
      e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4);
    }
    else if (input.length <= 10) {
      e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8);
    }
    else {
      e.target.value = input.slice(0, 2) + '/' + input.slice(2, 4) + '/' + input.slice(4, 8) + ' ' + input.slice(8, 10) + ':' + input.slice(10, 12);
    }
  } else {
    e.target.value = '';
  }
};

// Parsea DD/MM/YYYY hh:mm a Date
export const parseCitaInput = (input: string): Date | null => {
  const regex = /(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/;
  const match = input.match(regex);
  
  if (!match) return null;
  
  const [, day, month, year, hours, minutes] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  const hoursNum = parseInt(hours);
  const minutesNum = parseInt(minutes);

  // Validar rangos básicos
  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;
  if (hoursNum < 0 || hoursNum > 23) return null;
  if (minutesNum < 0 || minutesNum > 59) return null;

  const date = new Date(yearNum, monthNum - 1, dayNum, hoursNum, minutesNum);
  
  // Verificar que la fecha creada corresponde a los valores ingresados
  if (isNaN(date.getTime()) || 
      date.getDate() !== dayNum || 
      date.getMonth() !== monthNum - 1 || 
      date.getFullYear() !== yearNum ||
      date.getHours() !== hoursNum ||
      date.getMinutes() !== minutesNum) {
    return null;
  }
  
  return date;
};

// Formatea Date a DD/MM/YYYY hh:mm
export const formatDateTimeForInput = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

// Función para calcular horas laborables (excluyendo fines de semana)
export const calculateBusinessHours = (startDate: Date, endDate: Date): number => {
  let hours = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    // Solo contar si es día laboral (lunes=1 a viernes=5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      hours++;
    }
    current.setHours(current.getHours() + 1);
  }
  
  return hours;
};
