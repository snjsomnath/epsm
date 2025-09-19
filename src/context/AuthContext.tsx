/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, User, AuthSession } from '../lib/auth-browser';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  error: null,
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session in localStorage
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession) as AuthSession;
        
        // For now, just assume the session is valid
        // In a real implementation, you'd validate the token expiration
        setSession(parsedSession);
        setUser(parsedSession.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem('auth_session');
      }
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      clearError();

      const session = await authService.signIn({ email, password });
      setSession(session);
      setUser(session.user);
      setIsAuthenticated(true);
      localStorage.setItem('auth_session', JSON.stringify(session));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      clearError();
      
      const session = await authService.signUp({
        email,
        password
      });
      
      setSession(session);
      setUser(session.user);
      setIsAuthenticated(true);
      localStorage.setItem('auth_session', JSON.stringify(session));
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
      localStorage.removeItem('auth_session');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    isAuthenticated,
    user,
    session,
    signIn,
    signUp,
    signOut,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};