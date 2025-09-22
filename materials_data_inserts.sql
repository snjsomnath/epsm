--
-- PostgreSQL database dump
--

\restrict gTa2kMecT3zk6hze5vO31QKseeAdWiOhyfeXpmSwWFd34BttaUPTJHdtHWfbleG

-- Dumped from database version 15.14 (Homebrew)
-- Dumped by pg_dump version 15.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--

INSERT INTO public.materials (
	id, name, roughness, thickness_m, conductivity_w_mk, solar_transmittance, front_solar_reflectance, back_solar_reflectance, visible_transmittance, front_visible_reflectance, back_visible_reflectance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, dirt_correction_factor, solar_diffusing, youngs_modulus_pa, poisson_ratio, angle_trans_table, angle_front_refl_table, angle_back_refl_table, gwp_kgco2e_per_m2, cost_sek_per_m2, created_at, source
) VALUES
	('c4cc73d9-ff3e-4ef4-b5b5-cf4eb517c1ab', 'Brick', 'MediumRough', 0.1016, 0.89, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 85.2, 450, '2025-05-25 12:40:12.90199+02', NULL),
	('482ea462-0e92-4a97-aad4-a4af99dfc9df', 'Insulation Fiberglass', 'MediumRough', 0.0889, 0.043, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 12.5, 120, '2025-05-25 12:40:12.90199+02', NULL),
	('647d1be6-7899-4ac5-8b4c-05551db16b6d', 'Concrete Block', 'MediumRough', 0.2032, 0.51, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 120.4, 380, '2025-05-25 12:40:12.90199+02', NULL),
	('c16e762e-08b4-4221-84d8-5def42b6e2c7', 'Gypsum Board', 'Smooth', 0.0127, 0.16, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7.2, 85, '2025-05-25 14:56:06.655458+02', NULL),
	('9a29b2a4-8eba-4c86-9dbd-829014c09765', 'Wood Siding', 'MediumSmooth', 0.0191, 0.14, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8.3, 175, '2025-05-25 14:56:06.655458+02', NULL);
INSERT INTO public.materials (
    id, name, roughness, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at
) VALUES
    ('c4cc73d9-ff3e-4ef4-b5b5-cf4eb517c1ab', 'Brick', 'MediumRough', 0.1016, 0.89, 1920, 790, 0.9, 0.7, 0.7, 85.2, 450, true, false, false, false, NULL, '2025-05-25 12:40:12.90199+02', '2025-05-25 12:40:12.90199+02', NULL, '2025-05-25 12:40:12.90199+02'),
    ('482ea462-0e92-4a97-aad4-a4af99dfc9df', 'Insulation Fiberglass', 'MediumRough', 0.0889, 0.043, 12, 840, 0.9, 0.7, 0.7, 12.5, 120, true, true, true, false, NULL, '2025-05-25 12:40:12.90199+02', '2025-05-25 12:40:12.90199+02', NULL, '2025-05-25 12:40:12.90199+02'),
    ('647d1be6-7899-4ac5-8b4c-05551db16b6d', 'Concrete Block', 'MediumRough', 0.2032, 0.51, 1400, 1000, 0.9, 0.7, 0.7, 120.4, 380, true, false, true, false, NULL, '2025-05-25 12:40:12.90199+02', '2025-05-25 12:40:12.90199+02', NULL, '2025-05-25 12:40:12.90199+02'),
    ('c16e762e-08b4-4221-84d8-5def42b6e2c7', 'Gypsum Board', 'Smooth', 0.0127, 0.16, 800, 1090, 0.9, 0.7, 0.7, 7.2, 85, true, true, false, false, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02'),
    ('9a29b2a4-8eba-4c86-9dbd-829014c09765', 'Wood Siding', 'MediumSmooth', 0.0191, 0.14, 530, 900, 0.9, 0.7, 0.7, 8.3, 175, true, false, false, false, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.materials (id, name, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at) VALUES ('54623324-adf4-4c5c-aca7-3529f915b951', '6 in. Normalweight Concrete Floor', 0.1524, 2.3084552, 2322.0054, 831.46356, 0.9, 0.7, 0.7, 0, 0, true, true, true, false, '0a96a99c-9ec0-409f-9073-b61781aa64ed', '2025-06-10 13:21:35.212467+02', '2025-06-10 13:21:35.212467+02', 'Extracted from clean.idf', '2025-06-10 13:21:35.212467+02');
INSERT INTO public.materials (id, name, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at) VALUES ('c655b907-fd68-4a3f-92a3-e07246d38a08', 'test', 2, 2, 2, 2, 0.9, 0.7, 0.7, 2, 2, false, false, false, true, NULL, '2025-09-18 13:23:52.932301+02', '2025-09-18 13:23:52.932301+02', 'User Created via API', '2025-09-18 13:23:52.932301+02');
INSERT INTO public.materials (id, name, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at) VALUES ('3c0e2424-90e9-4819-ab29-3932d0652a2c', 'Final Test Material', 0.1, 1, 1000, 1000, 0.9, 0.7, 0.7, 0, 0, true, true, true, false, NULL, '2025-09-18 13:37:33.792726+02', '2025-09-18 13:37:33.792726+02', 'User Created via API', '2025-09-18 13:37:33.792726+02');
INSERT INTO public.materials (id, name, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at) VALUES ('b1dea490-7c66-47e7-a699-5ab81f2887d0', 'Final Test Material 2024', 0.1, 1, 1000, 1000, 0.9, 0.7, 0.7, 0, 0, true, true, true, false, NULL, '2025-09-18 13:37:42.239303+02', '2025-09-18 13:37:42.239303+02', 'User Created via API', '2025-09-18 13:37:42.239303+02');


--
-- PostgreSQL database dump complete
--

\unrestrict gTa2kMecT3zk6hze5vO31QKseeAdWiOhyfeXpmSwWFd34BttaUPTJHdtHWfbleG

