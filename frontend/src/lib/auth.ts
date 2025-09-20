/**
 * Custom Authentication Service
 * JWT-based authentication for PostgreSQL backend
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthUser, AuthSession, AuthError } from '../types/auth';

// API endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// CSRF token helper
const getCSRFToken = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/csrf/`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.csrfToken;
};

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export interface User {
  id: string;
  email: string;
  role: string;
  email_confirmed: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: User;
}

export interface AuthResult {
  data?: {
    user: User;
    session: AuthSession;
  };
  error?: {
    message: string;
    status?: number;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  role?: string;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(user: User): string {
    return jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        role: user.role,
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      JWT_SECRET
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(): string {
    return jwt.sign(
      { 
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET
    );
  }

  /**
   * Create a session object
   */
  private createSession(user: User): AuthSession {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      token_type: 'bearer',
      user
    };
  }

  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        return {
          error: {
            message: 'User with this email already exists',
            status: 400
          }
        };
      }

      // Hash the password
      const passwordHash = await this.hashPassword(data.password);

      // Insert new user
      const userResult = await db.query(`
        INSERT INTO users (email, password_hash, email_confirmed, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now(), now())
        RETURNING id, email, role, email_confirmed, created_at, updated_at
      `, [data.email, passwordHash, false, data.role || 'user']);

      if (userResult.rows.length === 0) {
        return {
          error: {
            message: 'Failed to create user',
            status: 500
          }
        };
      }

      const user = userResult.rows[0] as User;

      // Create user profile if additional data provided
      if (data.firstName || data.lastName || data.organization) {
        await db.query(`
          INSERT INTO user_profiles (user_id, first_name, last_name, organization, created_at, updated_at)
          VALUES ($1, $2, $3, $4, now(), now())
        `, [user.id, data.firstName || null, data.lastName || null, data.organization || null]);
      }

      // Create session
      const session = this.createSession(user);

      // Store refresh token
      await db.query(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, session.refresh_token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]);

      return {
        data: {
          user,
          session
        }
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Sign up failed',
          status: 500
        }
      };
    }
  }

  /**
   * Sign in a user
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // Find user by email
      const userResult = await db.query(`
        SELECT id, email, password_hash, role, email_confirmed, created_at, updated_at
        FROM users 
        WHERE email = $1
      `, [email]);

      if (userResult.rows.length === 0) {
        return {
          error: {
            message: 'Invalid email or password',
            status: 401
          }
        };
      }

      const userData = userResult.rows[0];

      // Verify password
      const isValidPassword = await this.verifyPassword(password, userData.password_hash);
      if (!isValidPassword) {
        return {
          error: {
            message: 'Invalid email or password',
            status: 401
          }
        };
      }

      // Update last sign in
      await db.query(`
        UPDATE users 
        SET last_sign_in = now(), updated_at = now()
        WHERE id = $1
      `, [userData.id]);

      const user: User = {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        email_confirmed: userData.email_confirmed,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_sign_in: new Date().toISOString()
      };

      // Create session
      const session = this.createSession(user);

      // Store refresh token
      await db.query(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, session.refresh_token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]);

      return {
        data: {
          user,
          session
        }
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Sign in failed',
          status: 500
        }
      };
    }
  }

  /**
   * Sign out a user
   */
  async signOut(refreshToken?: string): Promise<{ error?: { message: string } }> {
    try {
      if (refreshToken) {
        // Revoke the refresh token
        await db.query(`
          UPDATE refresh_tokens 
          SET revoked = true 
          WHERE token = $1
        `, [refreshToken]);
      }
      
      return {};
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Sign out failed'
        }
      };
    }
  }

  /**
   * Get user from JWT token
   */
  async getUser(token: string): Promise<{ data?: { user: User }, error?: { message: string } }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const userResult = await db.query(`
        SELECT id, email, role, email_confirmed, created_at, updated_at, last_sign_in
        FROM users 
        WHERE id = $1
      `, [decoded.sub]);

      if (userResult.rows.length === 0) {
        return {
          error: {
            message: 'User not found'
          }
        };
      }

      const user = userResult.rows[0] as User;
      return {
        data: { user }
      };
    } catch (error) {
      return {
        error: {
          message: 'Invalid token'
        }
      };
    }
  }

  /**
   * Refresh session using refresh token
   */
  async refreshSession(refreshToken: string): Promise<AuthResult> {
    try {
      // Check if refresh token exists and is not revoked
      const tokenResult = await db.query(`
        SELECT user_id FROM refresh_tokens 
        WHERE token = $1 AND revoked = false AND expires_at > now()
      `, [refreshToken]);

      if (tokenResult.rows.length === 0) {
        return {
          error: {
            message: 'Invalid refresh token',
            status: 401
          }
        };
      }

      const userId = tokenResult.rows[0].user_id;

      // Get user
      const userResult = await db.query(`
        SELECT id, email, role, email_confirmed, created_at, updated_at, last_sign_in
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return {
          error: {
            message: 'User not found',
            status: 404
          }
        };
      }

      const user = userResult.rows[0] as User;

      // Create new session
      const session = this.createSession(user);

      // Revoke old refresh token
      await db.query(`
        UPDATE refresh_tokens 
        SET revoked = true 
        WHERE token = $1
      `, [refreshToken]);

      // Store new refresh token
      await db.query(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, session.refresh_token, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]);

      return {
        data: {
          user,
          session
        }
      };
    } catch (error) {
      console.error('Refresh session error:', error);
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to refresh session',
          status: 500
        }
      };
    }
  }

  /**
   * Validate email domain against allowed domains
   */
  async validateEmailDomain(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      
      const result = await db.query(`
        SELECT 1 FROM allowed_email_domains WHERE domain = $1
        UNION
        SELECT 1 FROM allowed_emails WHERE email = $1
      `, [domain, email]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Email validation error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();