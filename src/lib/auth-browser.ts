// Browser-compatible authentication service
// This service makes HTTP requests to a backend API instead of handling JWT/bcrypt directly

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
}

class BrowserAuthService {
  private baseUrl: string;
  private currentSession: AuthSession | null = null;

  constructor() {
    // For development, we'll use a placeholder API
    // In production, this would point to your backend API
    this.baseUrl = 'http://localhost:8000/api/auth'; // Django backend URL
    this.loadSessionFromStorage();
  }

  private loadSessionFromStorage(): void {
    try {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        this.currentSession = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load session from storage:', error);
      localStorage.removeItem('auth_session');
    }
  }

  private saveSessionToStorage(session: AuthSession | null): void {
    if (session) {
      localStorage.setItem('auth_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('auth_session');
    }
    this.currentSession = session;
  }

  async signIn(credentials: SignInCredentials): Promise<AuthSession> {
    try {
      console.log('SignIn attempt:', credentials.email);
      
      const response = await fetch(`${this.baseUrl}/login/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Authentication failed');
      }
      
      const data = await response.json();
      
      // Convert Django response to our session format
      const session: AuthSession = {
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
        access_token: data.session.sessionid,
        refresh_token: data.session.sessionid, // Django uses session-based auth
      };

      this.saveSessionToStorage(session);
      return session;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    try {
      console.log('SignUp attempt:', credentials.email);
      
      // For this demo, we'll just redirect to sign in
      // In a real implementation, you'd create a Django user registration endpoint
      throw new Error('User registration not implemented. Please contact administrator for account creation.');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // Call Django logout endpoint
      await fetch(`${this.baseUrl}/logout/`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
      });

      this.saveSessionToStorage(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local session even if backend call fails
      this.saveSessionToStorage(null);
    }
  }

  async refreshSession(): Promise<AuthSession | null> {
    try {
      if (!this.currentSession?.refresh_token) {
        return null;
      }

      // Mock refresh - in real implementation this would call the backend
      const refreshedSession: AuthSession = {
        ...this.currentSession,
        access_token: 'refreshed_access_token_' + Date.now(),
      };

      this.saveSessionToStorage(refreshedSession);
      return refreshedSession;
    } catch (error) {
      console.error('Session refresh error:', error);
      this.saveSessionToStorage(null);
      return null;
    }
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  getCurrentUser(): User | null {
    return this.currentSession?.user || null;
  }

  isSignedIn(): boolean {
    return this.currentSession !== null;
  }
}

export const authService = new BrowserAuthService();