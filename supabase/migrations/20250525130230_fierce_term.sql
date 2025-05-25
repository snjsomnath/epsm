/*
  # Update Materials RLS Policies

  1. Changes
    - Drop existing RLS policies for materials table
    - Create new policies that:
      - Allow all authenticated users to read all materials
      - Allow users to insert their own materials
      - Allow users to update their own materials
  
  2. Security
    - Maintains RLS enabled on materials table
    - Ensures proper access control while fixing the 401 error
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all materials" ON materials;
DROP POLICY IF EXISTS "Users can insert own materials" ON materials;
DROP POLICY IF EXISTS "Users can update own materials" ON materials;

-- Create new policies with proper permissions
CREATE POLICY "Enable read access for authenticated users"
ON materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON materials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable update for own materials"
ON materials FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);