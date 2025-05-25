/*
  # Material Database Schema

  1. New Tables
    - `materials`
      - Basic material properties
      - Environmental impact data
      - Application constraints
    - `window_glazing`
      - Glazing properties
      - Optical and thermal data
    - `constructions`
      - Layer-based constructions
      - Performance metrics
    - `construction_sets`
      - Complete building element sets
    - `layers`
      - Construction layer definitions
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Materials table
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  roughness TEXT CHECK (roughness IN ('VeryRough', 'Rough', 'MediumRough', 'MediumSmooth', 'Smooth', 'VerySmooth')),
  thickness_m REAL NOT NULL,
  conductivity_w_mk REAL NOT NULL,
  density_kg_m3 REAL NOT NULL,
  specific_heat_j_kgk REAL NOT NULL,
  thermal_absorptance REAL DEFAULT 0.9,
  solar_absorptance REAL DEFAULT 0.7,
  visible_absorptance REAL DEFAULT 0.7,
  gwp_kgco2e_per_m2 REAL NOT NULL,
  cost_sek_per_m2 REAL NOT NULL,
  wall_allowed BOOLEAN DEFAULT false,
  roof_allowed BOOLEAN DEFAULT false,
  floor_allowed BOOLEAN DEFAULT false,
  window_layer_allowed BOOLEAN DEFAULT false,
  author_id uuid REFERENCES auth.users,
  date_created TIMESTAMPTZ DEFAULT now(),
  date_modified TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Window glazing table
CREATE TABLE window_glazing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  thickness_m REAL NOT NULL,
  conductivity_w_mk REAL NOT NULL,
  solar_transmittance REAL,
  visible_transmittance REAL,
  infrared_transmittance REAL DEFAULT 0.0,
  front_ir_emissivity REAL DEFAULT 0.84,
  back_ir_emissivity REAL DEFAULT 0.84,
  gwp_kgco2e_per_m2 REAL NOT NULL,
  cost_sek_per_m2 REAL NOT NULL,
  author_id uuid REFERENCES auth.users,
  date_created TIMESTAMPTZ DEFAULT now(),
  date_modified TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Constructions table
CREATE TABLE constructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  element_type TEXT CHECK (element_type IN ('wall', 'roof', 'floor', 'ceiling', 'window')),
  is_window BOOLEAN DEFAULT false,
  u_value_w_m2k REAL NOT NULL,
  gwp_kgco2e_per_m2 REAL NOT NULL,
  cost_sek_per_m2 REAL NOT NULL,
  author_id uuid REFERENCES auth.users,
  date_created TIMESTAMPTZ DEFAULT now(),
  date_modified TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Construction layers table
CREATE TABLE layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES constructions ON DELETE CASCADE,
  material_id uuid REFERENCES materials,
  glazing_id uuid REFERENCES window_glazing,
  layer_order INTEGER NOT NULL,
  is_glazing_layer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT layer_material_or_glazing CHECK (
    (material_id IS NOT NULL AND glazing_id IS NULL) OR
    (material_id IS NULL AND glazing_id IS NOT NULL)
  ),
  UNIQUE(construction_id, layer_order)
);

-- Construction sets table
CREATE TABLE construction_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  wall_construction_id uuid REFERENCES constructions,
  roof_construction_id uuid REFERENCES constructions,
  floor_construction_id uuid REFERENCES constructions,
  window_construction_id uuid REFERENCES constructions,
  author_id uuid REFERENCES auth.users,
  date_created TIMESTAMPTZ DEFAULT now(),
  date_modified TIMESTAMPTZ DEFAULT now(),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE window_glazing ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_sets ENABLE ROW LEVEL SECURITY;

-- Policies for materials
CREATE POLICY "Users can read all materials"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Policies for window glazing
CREATE POLICY "Users can read all glazing"
  ON window_glazing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own glazing"
  ON window_glazing FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own glazing"
  ON window_glazing FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Policies for constructions
CREATE POLICY "Users can read all constructions"
  ON constructions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own constructions"
  ON constructions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own constructions"
  ON constructions FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Policies for layers
CREATE POLICY "Users can read all layers"
  ON layers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage layers of own constructions"
  ON layers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM constructions
      WHERE constructions.id = layers.construction_id
      AND constructions.author_id = auth.uid()
    )
  );

-- Policies for construction sets
CREATE POLICY "Users can read all construction sets"
  ON construction_sets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own construction sets"
  ON construction_sets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own construction sets"
  ON construction_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Add demo data
INSERT INTO materials (
  name, roughness, thickness_m, conductivity_w_mk, density_kg_m3,
  specific_heat_j_kgk, gwp_kgco2e_per_m2, cost_sek_per_m2,
  wall_allowed, roof_allowed, floor_allowed
) VALUES
  ('Brick', 'MediumRough', 0.1016, 0.89, 1920, 790, 85.2, 450, true, false, false),
  ('Insulation Fiberglass', 'MediumRough', 0.0889, 0.043, 12, 840, 12.5, 120, true, true, true),
  ('Concrete Block', 'MediumRough', 0.2032, 0.51, 1400, 1000, 120.4, 380, true, false, true);

INSERT INTO window_glazing (
  name, thickness_m, conductivity_w_mk, solar_transmittance,
  visible_transmittance, gwp_kgco2e_per_m2, cost_sek_per_m2
) VALUES
  ('Clear 3mm', 0.003, 0.9, 0.837, 0.898, 25.5, 350),
  ('Low-E 6mm', 0.006, 0.9, 0.42, 0.71, 35.8, 620);