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

  useEffect(() => {
    const savedUser = Cookies.get('ritest_user');
    console.log('AuthContext - Loading saved user from cookies:', savedUser);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('AuthContext - Parsed user:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        Cookies.remove('ritest_user');
      }
    } else {
      console.log('AuthContext - No saved user found in cookies');
    }
    setLoading(false);
  }, []);

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
      const authenticatedUser = await airtableService.authenticateUser(email, password);
      console.log('Authenticated user from Airtable:', authenticatedUser);
      if (authenticatedUser) {
        // Asegurar logoUrl si no vino en authenticateUser
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
      } else {
        throw new Error('Credenciales inválidas');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
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