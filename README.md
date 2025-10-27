# CRM Ritest

Este proyecto es un CRM para la empresa Ritest, conectado a Airtable y diseñado para el personal administrativo.

## Características

...
# Portal Sonrisia - Clínicas Dentales

Portal web profesional para la gestión de clínicas dentales con integración a Airtable.

## Características

- **Autenticación**: Login con email/contraseña y Google OAuth
- **Dashboard**: Estadísticas y gráficos de llamadas y citas
- **Gestión de Tareas**: Actualización de estados conectada a Airtable
- **Facturas**: Visualización de facturas con importes y fechas
- **Agendamiento**: Formulario de Fillout para programar reuniones
- **Configuración**: Gestión de datos del usuario
- **Diseño Responsivo**: Optimizado para móvil y desktop

## Configuración de Airtable

### Estructura de Tablas Requeridas

#### Tabla: Users
- `Email` (Single line text)
- `Password` (Single line text)
- `Name` (Single line text)
- `Phone` (Phone number)
- `Clinic` (Single line text)
- `Role` (Single select: admin, user)

#### Tabla: Tasks
- `Title` (Single line text)
- `Description` (Long text)
- `Status` (Single select: pending, in-progress, completed)
- `AssignedTo` (Single line text)
- `DueDate` (Date)
- `Priority` (Single select: low, medium, high)

#### Tabla: Invoices
- `PatientName` (Single line text)
- `Amount` (Number)
- `Date` (Date)
- `Status` (Single select: paid, pending, overdue)
- `Description` (Long text)

### Configuración

1. Crea una base en Airtable con las tablas mencionadas
2. Obtén tu Base ID y API Key desde Airtable
3. Copia `.env.example` a `.env` y completa las variables (prefijo VITE_):

```env
VITE_AIRTABLE_BASE_ID=tu_base_id_aqui
VITE_AIRTABLE_API_KEY=tu_api_key_aqui
```

Nota: Si despliegas en DigitalOcean App Platform, define estas variables en el panel como VITE_AIRTABLE_BASE_ID y VITE_AIRTABLE_API_KEY para que Vite las inyecte en el build.

## Instalación y Uso

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Airtable

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

## Funcionalidades Principales

### Dashboard
- 4 tarjetas de resumen (llamadas y citas de 30 y 7 días)
- Gráfico de barras y líneas con datos de los últimos 7 días
- Diseño responsivo con colores corporativos

### Gestión de Tareas
- Lista de tareas con estados visuales
- Botón "Actualizar Estado" que modifica directamente en Airtable
- Información de asignación y fechas de vencimiento

### Facturas
- Tabla de facturas con importes formateados (sin símbolo de dólar)
- Estados visuales (pagada, pendiente, vencida)
- Resumen estadístico

### Agendamiento
- Integración con formularios de Fillout
- Título y subtítulo alineados a la izquierda
- Vista fullscreen del formulario

### Configuración
- Visualización y edición de datos del usuario
- Actualización directa en Airtable
- Preferencias de notificaciones

## Tecnologías Utilizadas

- React 18 con TypeScript
- Tailwind CSS para estilos
- React Router para navegación
- Recharts para gráficos
- Airtable API para datos
- React Query para gestión de estado
- Lucide React para iconos

## Personalización

### Colores Corporativos
- Azul principal: `#0059F1`
- Azul oscuro: `#003CB8`

### Logo
El logo "S" de Sonrisia se muestra en un círculo azul en toda la aplicación.

## Soporte

Para soporte técnico o consultas sobre la implementación, contacta al equipo de desarrollo.