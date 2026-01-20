export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  clinic?: string;
  role?: string;
  logoUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
}

export interface Invoice {
  id: string;
  number?: number | string;   // Número
  clinic: string;             // Clínica
  amount: number;             // Importe
  date: string;               // Fecha (ISO)
  status: 'paid' | 'pending' | 'overdue'; // Estado
  fileUrl?: string;           // URL del adjunto "Factura"
  description?: string;       // opcional
}

export interface Service {
  id: string;
  expediente?: string;
  fechaRegistro?: string;
  nombre?: string;
  cliente?: string; // Usado en Reparaciones.tsx
  telefono?: string;
  direccion?: string;
  estado?: string;
  estadoIpas?: string;
  estadoEnvio?: string;
  ultimoCambio?: string;
  descripcion?: string;
  comentarios?: string;
  motivoCancelacion?: string;
  cita?: string;
  tecnico?: string | string[];
  trabajadorId?: string[];
  formularioId?: string[];
  reparacionesId?: string[];
  notaTecnico?: string;
  citaTecnico?: string;
  chatbot?: string;
  fechaInstalacion?: string;
  referencia?: string;
  conversationId?: string;
  poblacion?: string;
  tramitado?: boolean;
  codigoPostal?: string;
  provincia?: string;
  numeroSerie?: string;
  importe?: number;
  accionIpartner?: string;
  ipartner?: string;
  resolucionVisita?: string;
  requiereAccion?: string;
  numero?: string;
  fechaEstado?: string; // Reparaciones.tsx
  seguimiento?: string; // Reparaciones.tsx
  fechaSeguimiento?: string; // Reparaciones.tsx
  resultado?: string; // Reparaciones.tsx
  reparacion?: string; // Reparaciones.tsx
  detalles?: string; // Reparaciones.tsx
  telefonoTecnico?: string; // Reparaciones.tsx
  servicioId?: string[]; // Reparaciones.tsx
  comentariosServicio?: string; // Reparaciones.tsx
}

export interface Tecnico {
  id: string;
  nombre?: string;
  provincia?: string;
  cliente?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  telefono?: string;
  catalogo?: string;
  transporte?: string;
  comentarios?: string;
  estado?: 'Contratado' | 'Contactado' | 'Sin contactar' | 'De baja';
  observaciones?: string;
  email?: string; // Añadido
}

export interface Formulario {
  id: string;
  expediente?: string;
  Detalles?: string;
  'Foto general'?: AirtableAttachment[];
  'Foto etiqueta'?: AirtableAttachment[];
  'Foto roto'?: AirtableAttachment[];
  'Foto cuadro'?: AirtableAttachment[];
  // ... añadir más campos según se necesiten
}

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

export interface Registro {
  id: string;
  contrato?: number;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  estado?: string;
  fecha?: string; // ISO string with datetime
  asesor?: string;
  cita?: string;
  comentarios?: string;
  informe?: string;
  expediente?: string;
  tramitado?: boolean;
  ipartner?: string;
  fechaIpartner?: string; // ISO string with datetime
  pdf?: AirtableAttachment[];
}

export interface Envio {
  id: string;
  numero?: string;
  numeroRecogida?: number;
  seguimiento?: string;
  servicio?: string;
  estado?: 'Envío creado' | 'Listo para enviar' | 'Enviado' | 'Entregado';
  transporte?: string;
  catalogo?: string;
  comentarios?: string;
  fechaEnvio?: string;
  fechaEstado?: string;
  fechaSeguimiento?: string;
  material?: string;
  producto?: string; // Solo lectura (lookup)
  fechaCambio?: string; // Solo lectura (timestamp)
  creacion?: string; // Solo lectura (timestamp de creación)
  cliente?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  provincia?: string;
  telefono?: string;
  conversationId?: string;
  tecnico?: string | string[]; // Linked record a tabla Técnicos
}

export interface DashboardStats {
  services30Days: number;
  services7Days: number;
  servicesCompleted30Days: number;
  servicesCompleted7Days: number;
  dailyData: {
    date: string;
    services: number;
    completed: number;
  }[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUserContext?: (patch: Partial<User>) => void;
}