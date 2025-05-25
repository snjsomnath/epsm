/*
  # Fix RLS policies for materials table

  1. Changes
    - Drop existing RLS policies for materials table
    - Create new comprehensive RLS policies that properly handle all operations
  
  2. Security
    - Enable RLS on materials table (already enabled)
    - Add policies for:
      - Reading materials (all authenticated users)
      - Creating materials (authenticated users, setting author_id)
      - Updating materials (authors only)
      - Deleting materials (authors only)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable update for own materials" ON materials;

-- Create new policies
CREATE POLICY "Enable read access for all authenticated users"
ON materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users with author_id"
ON materials FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable update for material authors"
ON materials FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Enable delete for material authors"
ON materials FOR DELETE
TO authenticated
USING (auth.uid() = author_id);