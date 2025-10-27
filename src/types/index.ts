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
  cliente?: string;
  telefono?: string;
  estado?: string;
  comentarios?: string;
  tecnico?: string;
  fotoReparado?: string;
  reparacion?: string;
}

export interface Tecnico {
  id: string;
  nombre?: string;
  provincia?: string;
  estado?: 'Contratado' | 'Contactado' | 'Sin contactar' | 'De baja';
  telefono?: string;
  observaciones?: string;
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
}

export interface Envio {
  id: string;
  seguimiento?: string;
  tipoOperacion?: 'Envío' | 'Recogida';
  estado?: 'Envío creado' | 'Paquete recogido' | 'Paquete entregado';
  fechaEnvio?: string;
  material?: string;
  producto?: string; // Solo lectura (lookup)
  fechaCambio?: string; // Solo lectura (timestamp)
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