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
      // For now, we'll create a mock session since we don't have the backend API yet
      // In a real implementation, this would make an HTTP request to your backend
      console.log('SignIn attempt:', credentials.email);
      
      // Mock successful authentication
      const mockSession: AuthSession = {
        user: {
          id: '1',
          email: credentials.email,
          created_at: new Date().toISOString(),
        },
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
      };

      this.saveSessionToStorage(mockSession);
      return mockSession;

      // Real implementation would be:
      // const response = await fetch(`${this.baseUrl}/signin`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(credentials),
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Authentication failed');
      // }
      // 
      // const session = await response.json();
      // this.saveSessionToStorage(session);
      // return session;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(credentials: SignUpCredentials): Promise<AuthSession> {
    try {
      console.log('SignUp attempt:', credentials.email);
      
      // Mock successful registration
      const mockSession: AuthSession = {
        user: {
          id: '2',
          email: credentials.email,
          created_at: new Date().toISOString(),
        },
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
      };

      this.saveSessionToStorage(mockSession);
      return mockSession;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // In a real implementation, this would notify the backend
      // await fetch(`${this.baseUrl}/signout`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${this.currentSession?.access_token}` },
      // });

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