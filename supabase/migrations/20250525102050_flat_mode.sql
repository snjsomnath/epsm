/*
  # Add specific allowed email addresses

  1. Changes
    - Add new table for individual allowed emails
    - Insert specified email addresses
    - Add RLS policy for admin access

  2. Security
    - Enable RLS on new table
    - Only admins can manage allowed emails
*/

-- Create table for specific allowed emails
CREATE TABLE allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Only allow admins to manage allowed emails
CREATE POLICY "Allow admins to manage allowed emails"
  ON allowed_emails FOR ALL 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Insert allowed email addresses
INSERT INTO allowed_emails (email, description)
VALUES 
  ('saraabo@chalmers.se', 'Sara Abo'),
  ('ssanjay@chalmers.se', 'Sanjay'),
  ('sanjay.somanath@chalmers.se', 'Sanjay Somanath'),
  ('alexander.hollberg@chalmers.se', 'Alexander Hollberg');