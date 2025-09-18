-- Fix foreign key constraints by creating missing users
-- and re-applying constraints

-- Insert the migration user that was referenced in the existing data
INSERT INTO users (
    id,
    email, 
    password_hash, 
    email_confirmed, 
    role,
    created_at,
    updated_at
) VALUES (
    '0a96a99c-9ec0-409f-9073-b61781aa64ed',
    'migration@chalmers.se',
    '$2b$10$K7kqJ5h.NmJGJUxZPDYjruBkm5h2nCvL0OQ6yZGfGhDqJLjB3O5ZS', -- 'demo123' hashed
    true,
    'admin',
    now(),
    now()
) ON CONFLICT (email) DO UPDATE SET 
    id = EXCLUDED.id,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Now add the foreign key constraints that failed before
ALTER TABLE materials 
ADD CONSTRAINT materials_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE scenarios 
ADD CONSTRAINT scenarios_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;