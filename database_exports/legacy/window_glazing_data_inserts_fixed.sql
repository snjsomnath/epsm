--
-- PostgreSQL database dump
--

\restrict pu4PZQ49ZLi2Sg3HDyoVPW205jFsrY0dLQ3bk7qIqQSDaAcuyVmC6mylpwknziG

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
-- Data for Name: window_glazing; Type: TABLE DATA; Schema: public; Owner: ssanjay
--

INSERT INTO public.window_glazing (id, name, thickness_m, conductivity_w_mk, solar_transmittance, visible_transmittance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('48216371-51d2-4277-a6a9-e3821c98fcd3', 'Clear 3mm', 0.003, 0.9, 0.837, 0.898, 0, 0.84, 0.84, 25.5, 350, NULL, '2025-05-25 12:40:12.90199+02', '2025-05-25 12:40:12.90199+02', NULL, '2025-05-25 12:40:12.90199+02');
INSERT INTO public.window_glazing (id, name, thickness_m, conductivity_w_mk, solar_transmittance, visible_transmittance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('a515212d-b18b-4944-992a-c4d70a13e6a6', 'Low-E 6mm', 0.006, 0.9, 0.42, 0.71, 0, 0.84, 0.84, 35.8, 620, NULL, '2025-05-25 12:40:12.90199+02', '2025-05-25 12:40:12.90199+02', NULL, '2025-05-25 12:40:12.90199+02');
INSERT INTO public.window_glazing (id, name, thickness_m, conductivity_w_mk, solar_transmittance, visible_transmittance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('c3e031ee-d9f3-4069-a712-d241ebeedfc8', 'Triple Low-E 4mm', 0.004, 0.9, 0.33, 0.65, 0, 0.84, 0.84, 42.3, 780, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');


--
-- PostgreSQL database dump complete
--

\unrestrict pu4PZQ49ZLi2Sg3HDyoVPW205jFsrY0dLQ3bk7qIqQSDaAcuyVmC6mylpwknziG

