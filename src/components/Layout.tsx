import React, { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Wrench,
  FileDown,
  Users,
  MessageCircle,
  ExternalLink,
  FileText,
  Lightbulb,
  CheckSquare,
  Package,
  Truck,
  ClipboardList,
  Calendar,
  UserCheck,
  Search,
  Bot,
  Star,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

interface NavigationGroup {
  title?: string;
  items: NavigationItem[];
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(false);
    const timer = setTimeout(() => setSidebarCollapsed(true), 10000);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navegación para Administrativa
  const navigationGroupsAdministrativa: NavigationGroup[] = [
    {
      items: [
        { name: 'Panel Gráfico', href: '/panel-grafico', icon: BarChart3 },
        { name: 'Tramitación', href: '/tramitacion', icon: ClipboardList },
        { name: 'Reparaciones', href: '/seguimiento-tecnicos', icon: UserCheck },
        { name: 'Técnicos', href: '/tecnicos', icon: Users },
        { name: 'Envíos', href: '/envios', icon: Package },
        { name: 'Tareas', href: '/tareas', icon: CheckSquare },
        { name: 'Asesoramientos', href: '/asesoramientos', icon: Lightbulb },
        { name: 'Valoraciones', href: '/valoraciones', icon: Star },
        { name: 'Ipartner', href: 'https://red.ipartner.es/Account/Login?ReturnUrl=%2fenergyefficiencyvisit%2fenergyefficiencyvisit', icon: ExternalLink, external: true },
      ],
    },
    {
      items: [
        { name: 'Buscador', href: '/buscador', icon: Search },
        { name: 'Recursos', href: '/recursos', icon: FileDown },
      ],
    },
  ];

  // Navegación para Asesora energética
  const navigationGroupsAsesora: NavigationGroup[] = [
    {
      items: [
        { name: 'Chatbot', href: '/chatbot', icon: Bot },
        { name: 'Tareas', href: '/tareas', icon: CheckSquare },
      ],
    },
  ];

  // Navegación para Técnico
  const navigationGroupsTecnico: NavigationGroup[] = [
    {
      items: [
        { name: 'Panel Gráfico', href: '/panel-grafico', icon: BarChart3 },
        { name: 'Agenda', href: '/agenda', icon: Calendar },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Reparaciones', href: '/seguimiento-tecnicos', icon: UserCheck },
        { name: 'Técnicos', href: '/tecnicos', icon: Users },
        { name: 'Envíos', href: '/envios', icon: Package },
        { name: 'Tareas', href: '/tareas', icon: CheckSquare },
      ],
    },
    {
      items: [
        { name: 'Buscador', href: '/buscador', icon: Search },
        { name: 'Recursos', href: '/recursos', icon: FileDown },
      ],
    },
  ];

  // Navegación completa para otros roles
  const navigationGroups: NavigationGroup[] = [
    {
      items: [
        { name: 'Panel Gráfico', href: '/panel-grafico', icon: BarChart3 },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Tramitación', href: '/tramitacion', icon: ClipboardList },
        { name: 'Reparaciones', href: '/seguimiento-tecnicos', icon: UserCheck },
        { name: 'Técnicos', href: '/tecnicos', icon: Users },
        { name: 'Envíos', href: '/envios', icon: Package },
        { name: 'Tareas', href: '/tareas', icon: CheckSquare },
        { name: 'Asesoramientos', href: '/asesoramientos', icon: Lightbulb },
        { name: 'Ipartner', href: 'https://red.ipartner.es/Account/Login?ReturnUrl=%2fenergyefficiencyvisit%2fenergyefficiencyvisit', icon: ExternalLink, external: true },
      ],
    },
    {
      items: [
        { name: 'Informe', href: '/informe', icon: FileText, external: true },
      ],
    },
    {
      items: [
        { name: 'Buscador', href: '/buscador', icon: Search },
        { name: 'Recursos', href: '/recursos', icon: FileDown },
      ],
    },
  ];

  // Seleccionar navegación según el rol (Puesto)
  const activeNavigationGroups = 
    user?.role === 'Administrativa' ? navigationGroupsAdministrativa :
    user?.role === 'Asesora energética' ? navigationGroupsAsesora :
    user?.role === 'Técnico' ? navigationGroupsTecnico :
    navigationGroups;

  // Ocultar "Técnicos" en el sidebar para todos excepto Responsable
  // Ocultar "Técnicos" para todos excepto Responsable
  // Ocultar "Seguimiento técnicos" para todos excepto Responsable, Administrativa y Técnico
  const finalNavigationGroups: NavigationGroup[] = activeNavigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // Técnicos solo para Responsable
      if (item.name === 'Técnicos' && user?.role !== 'Responsable') {
        return false;
      }
      // Reparaciones solo para Responsable, Administrativa y Técnico
      if (item.name === 'Reparaciones' && user?.role !== 'Responsable' && user?.role !== 'Administrativa' && user?.role !== 'Técnico') {
        return false;
      }
      return true;
    })
  }));

  // Debug: Ver qué rol tiene el usuario

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-900/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
            <div className="flex items-center">
              <img src="/ritest-logo.png" alt="Ritest" className="h-8 w-auto" />
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {finalNavigationGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={groupIndex > 0 && group.title ? 'pt-3 mt-3' : ''}>
                {group.title && (
                  <h3 className="px-3 mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {group.title}
                  </h3>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  if (item.external) {
                    const href = item.name === 'Informe' ? `${window.location.origin}${item.href}` : item.href;
                    return (
                      <a
                        key={item.name}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      >
                        <Icon className="h-5 w-5 mr-3 stroke-[1.5]" />
                        <span className="flex-1">{item.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group relative flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-primary rounded-r-full"></div>
                      )}
                      <Icon className="h-5 w-5 mr-3 stroke-[1.5]" />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3 stroke-[1.5]" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:flex-col transition-all duration-300`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className={`relative flex items-center h-16 px-4 border-b border-gray-100 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <img src="/ritest-logo.png" alt="Ritest" className="h-8 w-auto" />
            )}
            {!sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Colapsar sidebar"
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expandir sidebar"
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1 overflow-y-auto`}>
            {finalNavigationGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={groupIndex > 0 && group.title ? 'pt-3 mt-3' : ''}>
                {group.title && !sidebarCollapsed && (
                  <h3 className="px-3 mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {group.title}
                  </h3>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  if (item.external) {
                    const href = item.name === 'Informe' ? `${window.location.origin}${item.href}` : item.href;
                    return (
                      <a
                        key={item.name}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'} rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <Icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} stroke-[1.5]`} />
                        {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                        {!sidebarCollapsed && <ExternalLink className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group relative flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'} rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand-primary rounded-r-full"></div>
                      )}
                      <Icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} stroke-[1.5]`} />
                      {!sidebarCollapsed && <span className="flex-1">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100">
            {sidebarCollapsed ? (
              <div className="flex items-center justify-center mb-4">
                {user?.logoUrl ? (
                  <div className="relative">
                    <img
                      src={user.logoUrl}
                      alt={user?.name || 'Usuario'}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center mb-3 px-1">
                {user?.logoUrl ? (
                  <img
                    src={user.logoUrl}
                    alt={user?.name || 'Usuario'}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`group flex items-center w-full ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-50 transition-colors`}
              title={sidebarCollapsed ? 'Cerrar Sesión' : undefined}
            >
              <LogOut className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'} stroke-[1.5]`} />
              {!sidebarCollapsed && 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
  <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Header móvil */}
          <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-gray-400" />
            </button>
            <div className="flex items-center">
              <img src="/ritest-logo.png" alt="Ritest" className="h-6 w-auto" />
            </div>
            <div className="w-6" />
          </div>

        {/* Contenido */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;