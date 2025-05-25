-- Add demo account to allowed emails
INSERT INTO allowed_emails (email, description)
VALUES ('demo@chalmers.se', 'Demo Account')
ON CONFLICT (email) DO NOTHING;