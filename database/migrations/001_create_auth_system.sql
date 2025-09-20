-- Create Users Table for Custom Authentication
-- Create Django-compatible authentication system
-- This replaces external authentication services

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_confirmed BOOLEAN DEFAULT false,
    email_confirmation_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_sign_in TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_confirmation_token ON users(email_confirmation_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token);

-- Create refresh tokens table for JWT management
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    revoked BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Update user_profiles to reference our new users table
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update other tables to reference our new users table
ALTER TABLE user_preferences 
DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;

ALTER TABLE user_preferences 
ADD CONSTRAINT user_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

ALTER TABLE user_sessions 
ADD CONSTRAINT user_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update tables with author_id references
ALTER TABLE materials 
DROP CONSTRAINT IF EXISTS materials_author_id_fkey;

ALTER TABLE materials 
ADD CONSTRAINT materials_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE constructions 
DROP CONSTRAINT IF EXISTS constructions_author_id_fkey;

ALTER TABLE constructions 
ADD CONSTRAINT constructions_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE construction_sets 
DROP CONSTRAINT IF EXISTS construction_sets_author_id_fkey;

ALTER TABLE construction_sets 
ADD CONSTRAINT construction_sets_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE window_glazing 
DROP CONSTRAINT IF EXISTS window_glazing_author_id_fkey;

ALTER TABLE window_glazing 
ADD CONSTRAINT window_glazing_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE scenarios 
DROP CONSTRAINT IF EXISTS scenarios_author_id_fkey;

ALTER TABLE scenarios 
ADD CONSTRAINT scenarios_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE simulation_runs 
DROP CONSTRAINT IF EXISTS simulation_runs_user_id_fkey;

ALTER TABLE simulation_runs 
ADD CONSTRAINT simulation_runs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert demo user for testing
INSERT INTO users (
    id,
    email, 
    password_hash, 
    email_confirmed, 
    role,
    created_at,
    updated_at,
    last_sign_in
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@chalmers.se',
    '$2b$10$K7kqJ5h.NmJGJUxZPDYjruBkm5h2nCvL0OQ6yZGfGhDqJLjB3O5ZS', -- 'demo123' hashed
    true,
    'admin',
    now(),
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;