-- Create a demo user if it doesn't exist
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@chalmers.se')
ON CONFLICT (id) DO NOTHING;

-- Update RLS policies to handle demo user
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users with author_id" ON materials;
DROP POLICY IF EXISTS "Enable update for material authors" ON materials;
DROP POLICY IF EXISTS "Enable delete for material authors" ON materials;

CREATE POLICY "Enable read access for all authenticated users"
ON materials FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON materials FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable update for material authors"
ON materials FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable delete for material authors"
ON materials FOR DELETE
TO authenticated
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Apply similar policies to window_glazing
DROP POLICY IF EXISTS "Users can read all glazing" ON window_glazing;
DROP POLICY IF EXISTS "Users can insert own glazing" ON window_glazing;
DROP POLICY IF EXISTS "Users can update own glazing" ON window_glazing;

CREATE POLICY "Enable read access for all glazing"
ON window_glazing FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for glazing"
ON window_glazing FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable update for glazing authors"
ON window_glazing FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Apply similar policies to constructions
DROP POLICY IF EXISTS "Users can read all constructions" ON constructions;
DROP POLICY IF EXISTS "Users can insert own constructions" ON constructions;
DROP POLICY IF EXISTS "Users can update own constructions" ON constructions;

CREATE POLICY "Enable read access for all constructions"
ON constructions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for constructions"
ON constructions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable update for construction authors"
ON constructions FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Apply similar policies to construction_sets
DROP POLICY IF EXISTS "Users can read all construction sets" ON construction_sets;
DROP POLICY IF EXISTS "Users can insert own construction sets" ON construction_sets;
DROP POLICY IF EXISTS "Users can update own construction sets" ON construction_sets;

CREATE POLICY "Enable read access for all construction sets"
ON construction_sets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for construction sets"
ON construction_sets FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable update for construction set authors"
ON construction_sets FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);