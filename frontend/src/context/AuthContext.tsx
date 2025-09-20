import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signIn as apiSignIn, 
  signOut as apiSignOut, 
  getSession, 
  getUser, 
  isAuthenticated as checkAuth,
  AuthUser,
  AuthSession 
} from '../lib/auth-browser';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const existingSession = getSession();
    if (existingSession) {
      setSession(existingSession);
      setUser(existingSession.user);
      setIsAuthenticated(true);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      clearError();

      const result = await apiSignIn(email, password);
      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.data) {
        setSession(result.data);
        setUser(result.data.user);
        setIsAuthenticated(true);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      throw err;
    }
  };

  const signUp = async (_email: string, _password: string) => {
    try {
      clearError();
      
      // For now, just redirect to sign in since we don't have sign up API
      setError('Sign up not implemented yet. Please use existing credentials.');
      throw new Error('Sign up not implemented yet');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await apiSignOut();
      
      setIsAuthenticated(false);
      setUser(null);
      setSession(null);
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