/*
  # Add allowed email domains table
  
  1. New Tables
    - `allowed_email_domains` to restrict registration to specific domains
  2. Security
    - Enable RLS
    - Only admins can manage domains
*/

CREATE TABLE allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE allowed_email_domains ENABLE ROW LEVEL SECURITY;

-- Only allow admins to manage domains
CREATE POLICY "Allow admins to manage domains"
  ON allowed_email_domains FOR ALL 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Insert allowed domain
INSERT INTO allowed_email_domains (domain, description)
VALUES ('chalmers.se', 'Chalmers University of Technology');