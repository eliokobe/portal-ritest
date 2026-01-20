import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { airtableService } from '../services/airtable';
import Cookies from 'js-cookie';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Opciones de seguridad para cookies
  const cookieOptions = {
    expires: 7,
    secure: window.location.protocol === 'https:', // Solo HTTPS
    sameSite: 'lax' as const, // Previene CSRF
    path: '/', // Disponible en toda la aplicación
  };

  // Cargar usuario desde ID guardado en cookies al iniciar
  useEffect(() => {
    const loadUserSession = async () => {
      // Intentar primero desde cookies, luego desde localStorage
      let savedUserId = Cookies.get('ritest_session');
      
      if (!savedUserId) {
        savedUserId = localStorage.getItem('ritest_user_id') || undefined;
      }
      
      if (savedUserId) {
        try {
          // Obtener datos completos del usuario desde Airtable
          const userData = await airtableService.getUserById(savedUserId);
          if (userData) {
            // Cargar logo si es necesario
            if (!userData.logoUrl) {
              const logo = await airtableService.getClientLogo(userData.id);
              if (logo) {
                userData.logoUrl = logo;
              }
            }
            setUser(userData);
            
            // Asegurar que tanto cookie como localStorage estén sincronizados
            Cookies.set('ritest_session', savedUserId, cookieOptions);
            localStorage.setItem('ritest_user_id', savedUserId);
          } else {
            // Si no se encuentra el usuario, limpiar la sesión
            Cookies.remove('ritest_session', { path: '/' });
            localStorage.removeItem('ritest_user_id');
          }
        } catch (error) {
          console.error('Error loading user session:', error);
          Cookies.remove('ritest_session', { path: '/' });
          localStorage.removeItem('ritest_user_id');
        }
      }
      setLoading(false);
    };
    
    loadUserSession();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Autenticar con Airtable (tabla Trabajadores)
      const authenticatedUser = await airtableService.authenticateUser(email, password);
      
      if (!authenticatedUser) {
        throw new Error('Credenciales inválidas');
      }

      // Cargar logo si no existe
      let enriched = authenticatedUser;
      if (!enriched.logoUrl) {
        const logo = await airtableService.getClientLogo(enriched.id);
        if (logo) {
          enriched = { ...enriched, logoUrl: logo } as User;
        }
      }
      
      setUser(enriched);
      
      // Guardar el ID del usuario en cookies y localStorage (respaldo)
      Cookies.set('ritest_session', enriched.id, cookieOptions);
      localStorage.setItem('ritest_user_id', enriched.id);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    Cookies.remove('ritest_session', { path: '/' });
    localStorage.removeItem('ritest_user_id');
  };

  const updateUserContext = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as User;
      // No guardamos datos sensibles en cookies, solo mantenemos el ID
      return next;
    });
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    updateUserContext,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
