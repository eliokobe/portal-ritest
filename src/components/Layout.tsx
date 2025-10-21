import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3,
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
  GraduationCap,
} from 'lucide-react';
import { useState } from 'react';

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationGroups: NavigationGroup[] = [
    {
      title: 'Punto de Recarga',
      items: [
        { name: 'Panel Gráfico', href: '/panel-grafico', icon: BarChart3 },
        { name: 'Servicios', href: '/servicios', icon: Wrench },
        { name: 'Técnicos', href: '/tecnicos', icon: Users },
        { name: 'Formación', href: 'https://formacion.ritest.es/reparadores', icon: GraduationCap, external: true },
        { name: 'Ipas', href: 'https://red.ipartner.es/Account/Login?ReturnUrl=%2fenergyefficiencyvisit%2fenergyefficiencyvisit', icon: ExternalLink, external: true },
        { name: 'Whatsapp', href: 'https://chat.ritest.es', icon: MessageCircle, external: true },
        { name: 'Recursos', href: '/recursos', icon: FileDown },
      ],
    },
    {
      title: 'Asesoramiento',
      items: [
        { name: 'Asesoramientos', href: '/asesoramientos', icon: Lightbulb },
        { name: 'Informe', href: '/informe', icon: FileText, external: true },
        { name: 'Formación', href: 'https://formacion.ritest.es', icon: GraduationCap, external: true },
      ],
    },
    {
      items: [
        { name: 'Tareas', href: '/tareas', icon: CheckSquare },
        { name: 'Ajustes', href: '/ajustes', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <div className="flex items-center">
              <img src="/ritest-logo.png" alt="Ritest" className="h-8 w-auto" />
            </div>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigationGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {groupIndex > 0 && (
                  <div className="my-3 border-t border-gray-200" />
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
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100"
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        {item.name}
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:flex-col`}>
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className={`relative flex items-center h-16 px-4 border-b ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!sidebarCollapsed && (
              <img src="/ritest-logo.png" alt="Ritest" className="h-8 w-auto" />
            )}
            {!sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Colapsar sidebar"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={() => setSidebarCollapsed(false)}
                aria-label="Expandir sidebar"
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-4'} py-4 space-y-1 overflow-y-auto`}>
            {navigationGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {groupIndex > 0 && (
                  <div className={`${sidebarCollapsed ? 'my-2' : 'my-3'} border-t border-gray-200`} />
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
                        className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'} rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-100`}
                        title={sidebarCollapsed ? item.name : undefined}
                      >
                        <Icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                        {!sidebarCollapsed && item.name}
                      </a>
                    );
                  }
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'} rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                      {!sidebarCollapsed && item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="p-4 border-t">
            {sidebarCollapsed ? (
              <div className="flex items-center justify-center mb-4">
                {user?.logoUrl ? (
                  <img
                    src={user.logoUrl}
                    alt={user?.name || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center mb-4">
                {user?.logoUrl ? (
                  <img
                    src={user.logoUrl}
                    alt={user?.name || 'Usuario'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`flex items-center w-full ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100`}
            >
              <LogOut className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
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