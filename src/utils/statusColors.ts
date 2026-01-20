// Función que retorna los colores para cada estado
export const getStatusColors = (estado: string | undefined): { bg: string; text: string } => {
  if (!estado) return { bg: 'bg-gray-100', text: 'text-gray-800' };

  const estadoLower = estado.toLowerCase();

  // Estados específicos de Asesoramientos
  if (estadoLower === '1ª llamada') {
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  }
  
  if (estadoLower === '2ª llamada') {
    return { bg: 'bg-cyan-100', text: 'text-cyan-800' };
  }
  
  if (estadoLower === 'ilocalizable') {
    return { bg: 'bg-amber-100', text: 'text-amber-800' };
  }
  
  if (estadoLower === 'no interesado') {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
  
  if (estadoLower === 'informe') {
    return { bg: 'bg-purple-100', text: 'text-purple-800' };
  }
  
  if (estadoLower === 'inglés') {
    return { bg: 'bg-orange-100', text: 'text-orange-800' };
  }
  
  if (estadoLower === 'citado') {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  }

  // Estados de ipartner
  if (estadoLower === 'finalizado') {
    return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  }
  
  if (estadoLower === 'cancelado') {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
  
  if (estadoLower === 'facturado') {
    return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
  }

  // Estados de progreso inicial
  if (estadoLower.includes('sin contactar') || estadoLower.includes('contactado')) {
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  }
  
  // Formulario y documentación
  if (estadoLower.includes('formulario')) {
    return { bg: 'bg-purple-100', text: 'text-purple-800' };
  }
  
  // Llamadas
  if (estadoLower.includes('llamado')) {
    return { bg: 'bg-cyan-100', text: 'text-cyan-800' };
  }
  
  // Pendientes
  if (estadoLower.includes('pendiente')) {
    return { bg: 'bg-amber-100', text: 'text-amber-800' };
  }
  
  // Aceptación y asignación
  if (estadoLower.includes('aceptado') || estadoLower.includes('asignado')) {
    return { bg: 'bg-indigo-100', text: 'text-indigo-800' };
  }
  
  // Citas
  if (estadoLower.includes('citado') || estadoLower.includes('cita')) {
    return { bg: 'bg-violet-100', text: 'text-violet-800' };
  }
  
  // Presupuestos
  if (estadoLower.includes('presupuesto')) {
    return { bg: 'bg-orange-100', text: 'text-orange-800' };
  }
  
  // Material
  if (estadoLower.includes('material')) {
    return { bg: 'bg-pink-100', text: 'text-pink-800' };
  }
  
  // En curso / proceso
  if (estadoLower.includes('en curso') || estadoLower.includes('proceso')) {
    return { bg: 'bg-sky-100', text: 'text-sky-800' };
  }
  
  // Envíos
  if (estadoLower.includes('envío creado') || estadoLower.includes('listo para enviar')) {
    return { bg: 'bg-teal-100', text: 'text-teal-800' };
  }
  
  if (estadoLower.includes('enviado')) {
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  }
  
  if (estadoLower.includes('entregado')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  }
  
  if (estadoLower.includes('devuelto')) {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
  
  if (estadoLower.includes('reclamado')) {
    return { bg: 'bg-rose-100', text: 'text-rose-800' };
  }
  
  if (estadoLower.includes('recogida')) {
    return { bg: 'bg-lime-100', text: 'text-lime-800' };
  }
  
  // Finalizado
  if (estadoLower.includes('finalizado') || estadoLower.includes('completado')) {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  }
  
  // Cancelado
  if (estadoLower.includes('cancelado')) {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }

  // Default
  return { bg: 'bg-gray-100', text: 'text-gray-800' };
};

// Función para obtener colores de estados Ipartner
export const getIpartnerColors = (ipartner: string | undefined): { bg: string; text: string } => {
  if (!ipartner) return { bg: 'bg-gray-100', text: 'text-gray-800' };

  const ipartnerLower = ipartner.toLowerCase();

  if (ipartnerLower === 'citado') {
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  }
  
  if (ipartnerLower === 'cita confirmada') {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  }
  
  if (ipartnerLower === 'finalizado') {
    return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  }
  
  if (ipartnerLower === 'cancelado') {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
  
  if (ipartnerLower === 'facturado') {
    return { bg: 'bg-purple-100', text: 'text-purple-800' };
  }

  // Default
  return { bg: 'bg-gray-100', text: 'text-gray-800' };
};

// Función para obtener colores de seguimiento
export const getSeguimientoColors = (seguimiento: string | undefined): { bg: string; text: string } => {
  if (!seguimiento) return { bg: 'bg-gray-100', text: 'text-gray-800' };

  switch (seguimiento) {
    case 'Sin contactar':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    case 'Primera llamada':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'Segunda llamada':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'Whatsapp':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'Ilocalizable':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600' };
  }
};
