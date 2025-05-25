/*
  # Update materials table RLS policies

  1. Security Changes
    - Update RLS policy to allow all authenticated users to read all materials
    - Keep existing policies for insert and update operations
    
  2. Changes
    - Drop existing SELECT policy
    - Add new SELECT policy allowing all authenticated users to read all materials
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can read all materials" ON materials;

-- Create new SELECT policy allowing all authenticated users to read all materials
CREATE POLICY "Users can read all materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (true);