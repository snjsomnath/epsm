-- Insert demo user for development
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@chalmers.se')
ON CONFLICT (id) DO NOTHING;

-- Insert materials
INSERT INTO materials (
  name, roughness, thickness_m, conductivity_w_mk, density_kg_m3,
  specific_heat_j_kgk, gwp_kgco2e_per_m2, cost_sek_per_m2,
  wall_allowed, roof_allowed, floor_allowed, author_id
) VALUES
  ('Brick', 'MediumRough', 0.1016, 0.89, 1920, 790, 85.2, 450, true, false, false, '00000000-0000-0000-0000-000000000000'),
  ('Insulation Fiberglass', 'MediumRough', 0.0889, 0.043, 12, 840, 12.5, 120, true, true, true, '00000000-0000-0000-0000-000000000000'),
  ('Concrete Block', 'MediumRough', 0.2032, 0.51, 1400, 1000, 120.4, 380, true, false, true, '00000000-0000-0000-0000-000000000000'),
  ('Gypsum Board', 'Smooth', 0.0127, 0.16, 800, 1090, 7.2, 85, true, true, false, '00000000-0000-0000-0000-000000000000'),
  ('Wood Siding', 'MediumSmooth', 0.0191, 0.14, 530, 900, 8.3, 175, true, false, false, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- Insert window glazing
INSERT INTO window_glazing (
  name, thickness_m, conductivity_w_mk, solar_transmittance,
  visible_transmittance, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id
) VALUES
  ('Clear 3mm', 0.003, 0.9, 0.837, 0.898, 25.5, 350, '00000000-0000-0000-0000-000000000000'),
  ('Low-E 6mm', 0.006, 0.9, 0.42, 0.71, 35.8, 620, '00000000-0000-0000-0000-000000000000'),
  ('Triple Low-E 4mm', 0.004, 0.9, 0.33, 0.65, 42.3, 780, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- Insert constructions
INSERT INTO constructions (
  name, element_type, is_window, u_value_w_m2k,
  gwp_kgco2e_per_m2, cost_sek_per_m2, author_id
) VALUES
  ('Brick Wall with Insulation', 'wall', false, 0.35, 95.5, 620, '00000000-0000-0000-0000-000000000000'),
  ('Concrete Floor', 'floor', false, 0.4, 125.8, 480, '00000000-0000-0000-0000-000000000000'),
  ('Insulated Roof', 'roof', false, 0.25, 65.3, 550, '00000000-0000-0000-0000-000000000000'),
  ('Double Glazed Window', 'window', true, 1.8, 55.2, 1200, '00000000-0000-0000-0000-000000000000'),
  ('Triple Glazed Low-E Window', 'window', true, 0.8, 85.6, 2200, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;

-- Insert construction sets
INSERT INTO construction_sets (
  name, description, author_id
) VALUES
  ('Standard Construction Set', 'Basic construction set for typical buildings', '00000000-0000-0000-0000-000000000000'),
  ('High Performance Set', 'Energy efficient construction set for passive buildings', '00000000-0000-0000-0000-000000000000')
ON CONFLICT (name) DO NOTHING;