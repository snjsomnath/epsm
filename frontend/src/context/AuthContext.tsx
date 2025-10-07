import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signIn as apiSignIn, 
  signOut as apiSignOut, 
  getSession, 
  getUser, 
  isAuthenticated as checkAuth,
  getLoginInfo,
  getCurrentUser,
  redirectToSAMLLogin,
  AuthUser,
  AuthSession,
  LoginInfo
} from '../lib/auth-browser';

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  loginInfo: LoginInfo | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithSAML: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  session: null,
  loginInfo: null,
  signIn: async () => {},
  signInWithSAML: () => {},
  signUp: async () => {},
  signOut: async () => {},
  error: null,
  clearError: () => {},
  refreshAuth: async () => {},
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
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load login info on mount
  useEffect(() => {
    const loadLoginInfo = async () => {
      const result = await getLoginInfo();
      if (result.data) {
        setLoginInfo(result.data);
      }
    };
    loadLoginInfo();
  }, []);

  // Check for existing session
  useEffect(() => {
    const existingSession = getSession();
    if (existingSession) {
      setSession(existingSession);
      setUser(existingSession.user);
      setIsAuthenticated(true);
    } else {
      // Check if user is authenticated via SAML session
      refreshAuth();
    }
  }, []);

  const refreshAuth = async () => {
    try {
      const result = await getCurrentUser();
      if (result.data) {
        // User is authenticated via SAML, create a session
        const samlSession: AuthSession = {
          access_token: 'saml_session',
          refresh_token: 'saml_refresh',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: result.data
        };
        setSession(samlSession);
        setUser(result.data);
        setIsAuthenticated(true);
        localStorage.setItem('epsm_session', JSON.stringify(samlSession));
      }
    } catch (err) {
      console.error('Failed to refresh auth:', err);
    }
  };

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

  const signInWithSAML = () => {
    clearError();
    redirectToSAMLLogin('/');
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
    loginInfo,
    signIn,
    signInWithSAML,
    signUp,
    signOut,
    error,
    clearError,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};