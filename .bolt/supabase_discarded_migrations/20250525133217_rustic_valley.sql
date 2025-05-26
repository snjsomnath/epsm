/*
  # Initial Database Schema Setup

  1. New Tables
    - `materials`
      - Basic material properties
      - Environmental impact data
      - Application constraints
    - `window_glazing`
      - Optical and thermal properties
      - Environmental impact data
    - `constructions`
      - Assembly properties
      - Environmental impact data
    - `layers`
      - Construction layer ordering
      - Material and glazing references
    - `construction_sets`
      - Building element assignments
      - Set metadata

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  roughness text NOT NULL CHECK (roughness IN ('VeryRough', 'Rough', 'MediumRough', 'MediumSmooth', 'Smooth', 'VerySmooth')),
  thickness_m real NOT NULL,
  conductivity_w_mk real NOT NULL,
  density_kg_m3 real NOT NULL,
  specific_heat_j_kgk real NOT NULL,
  thermal_absorptance real DEFAULT 0.9,
  solar_absorptance real DEFAULT 0.7,
  visible_absorptance real DEFAULT 0.7,
  gwp_kgco2e_per_m2 real NOT NULL,
  cost_sek_per_m2 real NOT NULL,
  wall_allowed boolean DEFAULT false,
  roof_allowed boolean DEFAULT false,
  floor_allowed boolean DEFAULT false,
  window_layer_allowed boolean DEFAULT false,
  author_id uuid REFERENCES auth.users(id),
  date_created timestamptz DEFAULT now(),
  date_modified timestamptz DEFAULT now(),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

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

-- Window Glazing table
CREATE TABLE IF NOT EXISTS window_glazing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  thickness_m real NOT NULL,
  conductivity_w_mk real DEFAULT 0.9,
  solar_transmittance real,
  visible_transmittance real,
  infrared_transmittance real DEFAULT 0.0,
  front_ir_emissivity real DEFAULT 0.84,
  back_ir_emissivity real DEFAULT 0.84,
  gwp_kgco2e_per_m2 real NOT NULL,
  cost_sek_per_m2 real NOT NULL,
  author_id uuid REFERENCES auth.users(id),
  date_created timestamptz DEFAULT now(),
  date_modified timestamptz DEFAULT now(),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE window_glazing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all glazing"
  ON window_glazing
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own glazing"
  ON window_glazing
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own glazing"
  ON window_glazing
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Constructions table
CREATE TABLE IF NOT EXISTS constructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  element_type text NOT NULL CHECK (element_type IN ('wall', 'roof', 'floor', 'window')),
  is_window boolean DEFAULT false,
  u_value_w_m2k real NOT NULL,
  gwp_kgco2e_per_m2 real NOT NULL,
  cost_sek_per_m2 real NOT NULL,
  author_id uuid REFERENCES auth.users(id),
  date_created timestamptz DEFAULT now(),
  date_modified timestamptz DEFAULT now(),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all constructions"
  ON constructions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own constructions"
  ON constructions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own constructions"
  ON constructions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Layers table
CREATE TABLE IF NOT EXISTS layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES constructions(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id),
  glazing_id uuid REFERENCES window_glazing(id),
  layer_order integer NOT NULL,
  is_glazing_layer boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT layer_material_or_glazing CHECK (
    (material_id IS NOT NULL AND glazing_id IS NULL) OR
    (material_id IS NULL AND glazing_id IS NOT NULL)
  ),
  UNIQUE (construction_id, layer_order)
);

ALTER TABLE layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all layers"
  ON layers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage layers of own constructions"
  ON layers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM constructions
      WHERE constructions.id = layers.construction_id
      AND constructions.author_id = auth.uid()
    )
  );

-- Construction Sets table
CREATE TABLE IF NOT EXISTS construction_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  wall_construction_id uuid REFERENCES constructions(id),
  roof_construction_id uuid REFERENCES constructions(id),
  floor_construction_id uuid REFERENCES constructions(id),
  window_construction_id uuid REFERENCES constructions(id),
  author_id uuid REFERENCES auth.users(id),
  date_created timestamptz DEFAULT now(),
  date_modified timestamptz DEFAULT now(),
  source text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE construction_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all construction sets"
  ON construction_sets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own construction sets"
  ON construction_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own construction sets"
  ON construction_sets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);