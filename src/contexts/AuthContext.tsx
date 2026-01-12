import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { airtableService } from '../services/airtable';
import { supabaseService } from '../services/supabase';
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

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = Cookies.get('ritest_user');
      console.log('AuthContext - Loading saved user from cookies:', savedUser);
      
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('AuthContext - Parsed user:', parsedUser);
          
          // Verificar si hay una sesión activa de Supabase
          const { data, error } = await supabaseService.supabase.auth.getSession();
          
          if (error || !data.session) {
            console.warn('AuthContext - No hay sesión válida de Supabase, limpiando usuario');
            console.warn('AuthContext - Error:', error?.message);
            console.warn('AuthContext - Session:', data.session);
            Cookies.remove('ritest_user');
            setUser(null);
          } else {
            console.log('AuthContext - Sesión de Supabase válida, token:', data.session.access_token.substring(0, 20) + '...');
            setUser(parsedUser);
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          Cookies.remove('ritest_user');
        }
      } else {
        console.log('AuthContext - No saved user found in cookies');
      }
      setLoading(false);
    };
    
    checkSession();

    // Escuchar cambios en el estado de autenticación de Supabase
    const { data: authListener } = supabaseService.supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext - Supabase auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('AuthContext - Usuario desconectado por Supabase');
          setUser(null);
          Cookies.remove('ritest_user');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthContext - Token JWT refrescado automáticamente');
        } else if (event === 'SIGNED_IN' && !user) {
          // Si hay sesión pero no hay usuario local, intentar recuperar
          const savedUser = Cookies.get('ritest_user');
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              console.log('AuthContext - Restaurando usuario desde cookies después de sign in');
              setUser(parsedUser);
            } catch (error) {
              console.error('Error parsing saved user on sign in:', error);
            }
          }
        }
      }
    );

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [user]);

  // Si el usuario existe pero no tiene logoUrl, intenta cargarlo desde Airtable
  useEffect(() => {
    const maybeLoadLogo = async () => {
      if (user && !user.logoUrl) {
        const logo = await airtableService.getClientLogo(user.id);
        if (logo) {
          const updated = { ...user, logoUrl: logo } as User;
          setUser(updated);
          Cookies.set('ritest_user', JSON.stringify(updated), { expires: 7 });
        }
      }
    };
    maybeLoadLogo();
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1. Autenticar con Airtable
      const authenticatedUser = await airtableService.authenticateUser(email, password);
      console.log('Authenticated user from Airtable:', authenticatedUser);
      if (!authenticatedUser) {
        throw new Error('Credenciales inválidas');
      }

      // 2. Crear sesión en Supabase para obtener JWT token (REQUERIDO)
      const { data: supabaseData, error: supabaseError } = await supabaseService.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (supabaseError || !supabaseData.session) {
        console.error('Error creando sesión en Supabase:', supabaseError);
        throw new Error(`No se pudo crear sesión de autenticación. El usuario debe existir en Supabase.\nError: ${supabaseError?.message || 'Sin sesión'}`);
      }

      console.log('Sesión Supabase creada:', supabaseData.session.access_token ? 'Token obtenido' : 'Sin token');

      // 3. Asegurar logoUrl
      let enriched = authenticatedUser;
      if (!enriched.logoUrl) {
        const logo = await airtableService.getClientLogo(enriched.id);
        if (logo) {
          enriched = { ...enriched, logoUrl: logo } as User;
        }
      }
      
      console.log('Final enriched user:', enriched);
      setUser(enriched);
      Cookies.set('ritest_user', JSON.stringify(enriched), { expires: 7 });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Cerrar sesión en Supabase
    await supabaseService.supabase.auth.signOut();
    
    // Limpiar estado local
    setUser(null);
    Cookies.remove('ritest_user');
  };

  const updateUserContext = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as User;
      Cookies.set('ritest_user', JSON.stringify(next), { expires: 7 });
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