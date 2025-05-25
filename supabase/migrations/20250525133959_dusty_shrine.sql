/*
  # Update RLS policies
  
  1. Changes
    - Add RLS policies for all tables
    - Enable row-level security
    - Set up proper access control for authenticated users
    
  2. Security
    - All tables require authentication
    - Users can read all records
    - Authors can manage their own records
    - Demo user (ID: 00000000-0000-0000-0000-000000000000) records are public
*/

-- Materials table policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" 
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

-- Window glazing table policies
ALTER TABLE window_glazing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for glazing" 
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

CREATE POLICY "Enable delete for glazing authors" 
ON window_glazing FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Constructions table policies
ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for constructions" 
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

CREATE POLICY "Enable delete for construction authors" 
ON constructions FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

-- Layers table policies
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for layers" 
ON layers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable manage for layer authors" 
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

CREATE POLICY "Enable read access for sets" 
ON construction_sets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for sets" 
ON construction_sets FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);

CREATE POLICY "Enable update for set authors" 
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

CREATE POLICY "Enable delete for set authors" 
ON construction_sets FOR DELETE 
TO authenticated 
USING (
  auth.uid() = author_id OR 
  author_id = '00000000-0000-0000-0000-000000000000'
);