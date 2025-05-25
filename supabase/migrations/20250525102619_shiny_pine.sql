/*
  # Fix email validation

  1. Changes
    - Add indexes for faster email lookups
    - Add function to check if email is allowed
    - Fix domain check to be case insensitive
  
  2. Security
    - Maintain existing RLS policies
    - Add function for secure email validation
*/

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_allowed_domains_domain ON allowed_email_domains (LOWER(domain));

-- Create a function to check if an email is allowed
CREATE OR REPLACE FUNCTION is_email_allowed(check_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Convert email to lowercase for consistent comparison
  check_email := LOWER(check_email);
  
  -- First check if the specific email is allowed
  IF EXISTS (
    SELECT 1 FROM allowed_emails 
    WHERE LOWER(email) = check_email
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Extract domain from email
  email_domain := split_part(check_email, '@', 2);
  
  -- Then check if the domain is allowed
  RETURN EXISTS (
    SELECT 1 FROM allowed_email_domains 
    WHERE LOWER(domain) = email_domain
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify existing data
DO $$ 
BEGIN
  -- Ensure all emails are lowercase in allowed_emails
  UPDATE allowed_emails 
  SET email = LOWER(email) 
  WHERE email != LOWER(email);
  
  -- Ensure all domains are lowercase in allowed_email_domains
  UPDATE allowed_email_domains 
  SET domain = LOWER(domain) 
  WHERE domain != LOWER(domain);
END $$;