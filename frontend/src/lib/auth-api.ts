/**
 * Authentication service for EPSM
 * Connects to Django backend API for authentication
 */

// API configuration
// If VITE_API_BASE_URL is provided (e.g. in docker-compose) use it.
// Otherwise use a relative base so the Vite dev server proxy (server.proxy)
// can forward /api requests to the backend container.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper to build request URLs. If API_BASE_URL is empty we return a relative
// path so the dev server proxy handles the request. If a full base is set,
// we prepend it.
export const buildUrl = (path: string) => {
  if (!API_BASE_URL) return path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

// Type definitions
export interface AuthUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: AuthUser;
}

export interface AuthError {
  message: string;
  status?: number;
}

// CSRF token helper
const getCSRFToken = async (): Promise<string> => {
  try {
    const response = await fetch(buildUrl('/api/auth/csrf/'), {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('Failed to fetch CSRF token, status:', response.status);
      return '';
    }
    const data = await response.json();
    return data.csrfToken || '';
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
    return '';
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string): Promise<{ data: AuthSession | null; error: AuthError | null }> => {
  try {
    const csrfToken = await getCSRFToken();
    
    const response = await fetch(buildUrl('/api/auth/login/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        data: null,
        error: {
          message: errorData.error || 'Invalid email or password',
          status: response.status
        }
      };
    }

    const data = await response.json();
    
      // Create session object compatible with frontend
    const session: AuthSession = {
      access_token: data.token || 'django_session',
      refresh_token: 'django_refresh',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: data.user.id.toString(),
        email: data.user.email,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        is_active: data.user.is_active,
          is_staff: data.user.is_staff,
          is_superuser: data.user.is_superuser,
        date_joined: data.user.date_joined
      }
    };

    // Store session in localStorage for persistence
    localStorage.setItem('epsm_session', JSON.stringify(session));
    
    return {
      data: session,
      error: null
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Authentication failed',
        status: 500
      }
    };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    const csrfToken = await getCSRFToken();
    
    await fetch(buildUrl('/api/auth/logout/'), {
      method: 'POST',
      headers: {
        'X-CSRFToken': csrfToken,
      },
      credentials: 'include',
    });
    
    // Clear local session
    localStorage.removeItem('epsm_session');

    return { error: null };
  } catch (error) {
    console.error('Signout error:', error);
    // Clear local session even if there's an error
    localStorage.removeItem('epsm_session');
    return {
      error: {
        message: error instanceof Error ? error.message : 'Signout failed',
        status: 500
      }
    };
  }
};

/**
 * Get current session from localStorage
 */
export const getSession = (): AuthSession | null => {
  try {
    const sessionData = localStorage.getItem('epsm_session');
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem('epsm_session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    localStorage.removeItem('epsm_session');
    return null;
  }
};

/**
 * Get current user from session
 */
export const getUser = (): AuthUser | null => {
  const session = getSession();
  return session?.user || null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getSession() !== null;
};

/**
 * Refresh session token (for future use)
 */
export const refreshSession = async (): Promise<{ data: AuthSession | null; error: AuthError | null }> => {
  try {
    const currentSession = getSession();
    if (!currentSession) {
      return {
        data: null,
        error: { message: 'No session to refresh' }
      };
    }

    // For now, just return current session
    // In future, implement actual token refresh with Django
    return {
      data: currentSession,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Failed to refresh session'
      }
    };
  }
};

/**
 * Make authenticated API request
 */
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const session = getSession();
  
  const isFormData = typeof FormData !== 'undefined' && options.body && (options.body instanceof FormData || (options.body as any)?.constructor?.name === 'FormData');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
    // Only set JSON content-type when body is not FormData
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  };

  // Add authentication header if we have a session
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Add CSRF token for non-GET requests
  if (options.method && options.method !== 'GET') {
    try {
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    } catch (error) {
      console.warn('Failed to get CSRF token for request:', error);
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};
// Improve: wrap fetch to provide clearer error messages for non-OK responses
export const fetchWithErrors = async (url: string, options: RequestInit = {}) => {
  const res = await authenticatedFetch(url, options);
  if (res.ok) return res;

  // Try to parse JSON error body, fallback to text
  let bodyText = '';
  try {
    const clone = res.clone();
    const data = await clone.json().catch(() => null);
    if (data && typeof data === 'object') {
      bodyText = JSON.stringify(data);
    } else {
      bodyText = await res.text();
    }
  } catch (e) {
    try { bodyText = await res.text(); } catch (_) { bodyText = '<unreadable body>'; }
  }

  const err = new Error(`Request failed ${res.status} ${res.statusText}: ${bodyText}`);
  // attach details for callers that want structured info
  (err as any).status = res.status;
  (err as any).body = bodyText;
  throw err;
};