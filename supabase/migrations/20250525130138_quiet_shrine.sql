/*
  # Update Materials Table RLS Policies

  1. Changes
    - Modify RLS policies for the materials table to:
      - Allow authenticated users to read all materials
      - Allow authenticated users to insert materials with their user ID
      - Allow authenticated users to update their own materials
  
  2. Security
    - Maintains RLS protection while enabling necessary functionality
    - Ensures users can only modify their own materials
    - Allows reading of all materials for reference purposes
*/

-- Drop existing policies to recreate them with correct permissions
DROP POLICY IF EXISTS "Users can read all materials" ON materials;
DROP POLICY IF EXISTS "Users can insert own materials" ON materials;
DROP POLICY IF EXISTS "Users can update own materials" ON materials;

-- Create new policies with correct permissions
CREATE POLICY "Users can read all materials"
ON materials
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own materials"
ON materials
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own materials"
ON materials
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);