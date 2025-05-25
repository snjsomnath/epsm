/*
  # Update Row Level Security Policies

  1. Security Changes
    - Drop existing policies to avoid conflicts
    - Enable RLS on all tables
    - Create new policies for authenticated users
    - Add special handling for demo user records

  2. Policy Details
    - READ: All authenticated users can read
    - CREATE/UPDATE/DELETE: Users can only modify their own records
    - DEMO: Records with author_id = '00000000-0000-0000-0000-000000000000' are accessible to all
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials;
DROP POLICY IF EXISTS "Enable update for material authors" ON materials;
DROP POLICY IF EXISTS "Enable delete for material authors" ON materials;

DROP POLICY IF EXISTS "Enable read access for glazing" ON window_glazing;
DROP POLICY IF EXISTS "Enable insert for glazing" ON window_glazing;
DROP POLICY IF EXISTS "Enable update for glazing authors" ON window_glazing;
DROP POLICY IF EXISTS "Enable delete for glazing authors" ON window_glazing;

DROP POLICY IF EXISTS "Enable read access for constructions" ON constructions;
DROP POLICY IF EXISTS "Enable insert for constructions" ON constructions;
DROP POLICY IF EXISTS "Enable update for construction authors" ON constructions;
DROP POLICY IF EXISTS "Enable delete for construction authors" ON constructions;

DROP POLICY IF EXISTS "Enable read access for layers" ON layers;
DROP POLICY IF EXISTS "Enable manage for layer authors" ON layers;

DROP POLICY IF EXISTS "Enable read access for sets" ON construction_sets;
DROP POLICY IF EXISTS "Enable insert for sets" ON construction_sets;
DROP POLICY IF EXISTS "Enable update for set authors" ON construction_sets;
DROP POLICY IF EXISTS "Enable delete for set authors" ON construction_sets;

-- Materials table policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materials_read_policy" 
ON materials FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "materials_insert_policy" 
ON materials FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "materials_update_policy" 
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

CREATE POLICY "materials_delete_policy" 
ON materials FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Window glazing table policies
ALTER TABLE window_glazing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "glazing_read_policy" 
ON window_glazing FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "glazing_insert_policy" 
ON window_glazing FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "glazing_update_policy" 
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

CREATE POLICY "glazing_delete_policy" 
ON window_glazing FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Constructions table policies
ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "constructions_read_policy" 
ON constructions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "constructions_insert_policy" 
ON constructions FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "constructions_update_policy" 
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

CREATE POLICY "constructions_delete_policy" 
ON constructions FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Layers table policies
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "layers_read_policy" 
ON layers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "layers_manage_policy" 
ON layers FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM constructions c 
    WHERE c.id = construction_id 
    AND (
      c.author_id = auth.uid() OR 
      c.author_id = '00000000-0000-0000-0000-000000000000'
    )
  )
);

-- Construction sets table policies
ALTER TABLE construction_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sets_read_policy" 
ON construction_sets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "sets_insert_policy" 
ON construction_sets FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "sets_update_policy" 
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

CREATE POLICY "sets_delete_policy" 
ON construction_sets FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);