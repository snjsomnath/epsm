/*
  # Insert Mock Data

  1. Changes
    - Insert mock materials
    - Insert mock window glazing
    - Insert mock constructions and layers
    - Insert mock construction sets
  
  2. Security
    - Maintain existing RLS policies
*/

-- Insert mock materials
INSERT INTO materials (
  name, roughness, thickness_m, conductivity_w_mk, density_kg_m3,
  specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance,
  gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed
) VALUES
  ('Brick', 'MediumRough', 0.1016, 0.89, 1920, 790, 0.9, 0.7, 0.7, 85.2, 450, true, false, false),
  ('Insulation Fiberglass', 'MediumRough', 0.0889, 0.043, 12, 840, 0.9, 0.7, 0.7, 12.5, 120, true, true, true),
  ('Concrete Block', 'MediumRough', 0.2032, 0.51, 1400, 1000, 0.9, 0.7, 0.7, 120.4, 380, true, false, true),
  ('Gypsum Board', 'Smooth', 0.0127, 0.16, 800, 1090, 0.9, 0.7, 0.7, 7.2, 85, true, true, false),
  ('Wood Siding', 'MediumSmooth', 0.0191, 0.14, 530, 900, 0.9, 0.7, 0.7, 8.3, 175, true, false, false)
ON CONFLICT (name) DO NOTHING;

-- Insert mock window glazing
INSERT INTO window_glazing (
  name, thickness_m, conductivity_w_mk, solar_transmittance,
  visible_transmittance, gwp_kgco2e_per_m2, cost_sek_per_m2
) VALUES
  ('Clear 3mm', 0.003, 0.9, 0.837, 0.898, 25.5, 350),
  ('Low-E 6mm', 0.006, 0.9, 0.42, 0.71, 35.8, 620),
  ('Triple Low-E 4mm', 0.004, 0.9, 0.33, 0.65, 42.3, 780)
ON CONFLICT (name) DO NOTHING;

-- Insert mock constructions
INSERT INTO constructions (
  name, element_type, is_window, u_value_w_m2k,
  gwp_kgco2e_per_m2, cost_sek_per_m2
) VALUES
  ('Brick Wall with Insulation', 'wall', false, 0.35, 95.5, 620),
  ('Concrete Floor', 'floor', false, 0.4, 125.8, 480),
  ('Insulated Roof', 'roof', false, 0.25, 65.3, 550),
  ('Double Glazed Window', 'window', true, 1.8, 55.2, 1200),
  ('Triple Glazed Low-E Window', 'window', true, 0.8, 85.6, 2200)
ON CONFLICT (name) DO NOTHING;

-- Get material IDs
DO $$ 
DECLARE
  brick_id uuid;
  insulation_id uuid;
  concrete_id uuid;
  gypsum_id uuid;
  wood_id uuid;
  clear_glass_id uuid;
  lowe_glass_id uuid;
BEGIN
  SELECT id INTO brick_id FROM materials WHERE name = 'Brick';
  SELECT id INTO insulation_id FROM materials WHERE name = 'Insulation Fiberglass';
  SELECT id INTO concrete_id FROM materials WHERE name = 'Concrete Block';
  SELECT id INTO gypsum_id FROM materials WHERE name = 'Gypsum Board';
  SELECT id INTO wood_id FROM materials WHERE name = 'Wood Siding';
  SELECT id INTO clear_glass_id FROM window_glazing WHERE name = 'Clear 3mm';
  SELECT id INTO lowe_glass_id FROM window_glazing WHERE name = 'Low-E 6mm';

  -- Insert layers for brick wall
  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, brick_id, 1
  FROM constructions c
  WHERE c.name = 'Brick Wall with Insulation'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, insulation_id, 2
  FROM constructions c
  WHERE c.name = 'Brick Wall with Insulation'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, gypsum_id, 3
  FROM constructions c
  WHERE c.name = 'Brick Wall with Insulation'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  -- Insert layers for concrete floor
  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, concrete_id, 1
  FROM constructions c
  WHERE c.name = 'Concrete Floor'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, insulation_id, 2
  FROM constructions c
  WHERE c.name = 'Concrete Floor'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  -- Insert layers for insulated roof
  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, wood_id, 1
  FROM constructions c
  WHERE c.name = 'Insulated Roof'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, insulation_id, 2
  FROM constructions c
  WHERE c.name = 'Insulated Roof'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, material_id, layer_order)
  SELECT c.id, gypsum_id, 3
  FROM constructions c
  WHERE c.name = 'Insulated Roof'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  -- Insert layers for double glazed window
  INSERT INTO layers (construction_id, glazing_id, layer_order, is_glazing_layer)
  SELECT c.id, clear_glass_id, 1, true
  FROM constructions c
  WHERE c.name = 'Double Glazed Window'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, glazing_id, layer_order, is_glazing_layer)
  SELECT c.id, clear_glass_id, 2, true
  FROM constructions c
  WHERE c.name = 'Double Glazed Window'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  -- Insert layers for triple glazed window
  INSERT INTO layers (construction_id, glazing_id, layer_order, is_glazing_layer)
  SELECT c.id, lowe_glass_id, 1, true
  FROM constructions c
  WHERE c.name = 'Triple Glazed Low-E Window'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, glazing_id, layer_order, is_glazing_layer)
  SELECT c.id, clear_glass_id, 2, true
  FROM constructions c
  WHERE c.name = 'Triple Glazed Low-E Window'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;

  INSERT INTO layers (construction_id, glazing_id, layer_order, is_glazing_layer)
  SELECT c.id, lowe_glass_id, 3, true
  FROM constructions c
  WHERE c.name = 'Triple Glazed Low-E Window'
  ON CONFLICT (construction_id, layer_order) DO NOTHING;
END $$;

-- Insert mock construction sets
INSERT INTO construction_sets (
  name, description
) VALUES
  ('Standard Construction Set', 'Basic construction set for typical buildings'),
  ('High Performance Set', 'Energy efficient construction set for passive buildings'),
  ('Budget Friendly Set', 'Cost-effective construction set with moderate performance')
ON CONFLICT (name) DO NOTHING;

-- Link constructions to sets
DO $$
DECLARE
  wall_id uuid;
  roof_id uuid;
  floor_id uuid;
  window_double_id uuid;
  window_triple_id uuid;
BEGIN
  SELECT id INTO wall_id FROM constructions WHERE name = 'Brick Wall with Insulation';
  SELECT id INTO roof_id FROM constructions WHERE name = 'Insulated Roof';
  SELECT id INTO floor_id FROM constructions WHERE name = 'Concrete Floor';
  SELECT id INTO window_double_id FROM constructions WHERE name = 'Double Glazed Window';
  SELECT id INTO window_triple_id FROM constructions WHERE name = 'Triple Glazed Low-E Window';

  -- Update Standard Set
  UPDATE construction_sets
  SET 
    wall_construction_id = wall_id,
    roof_construction_id = roof_id,
    floor_construction_id = floor_id,
    window_construction_id = window_double_id
  WHERE name = 'Standard Construction Set';

  -- Update High Performance Set
  UPDATE construction_sets
  SET 
    wall_construction_id = wall_id,
    roof_construction_id = roof_id,
    floor_construction_id = floor_id,
    window_construction_id = window_triple_id
  WHERE name = 'High Performance Set';

  -- Update Budget Set
  UPDATE construction_sets
  SET 
    wall_construction_id = wall_id,
    roof_construction_id = roof_id,
    window_construction_id = window_double_id
  WHERE name = 'Budget Friendly Set';
END $$;