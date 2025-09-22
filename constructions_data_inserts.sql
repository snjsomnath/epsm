--
-- PostgreSQL database dump
--

\restrict mr3d4yDONcpbPPOPicsx4g8HdNoaMOMS1DC0HQN9FY0sBM0S7X4cohwcEEibHXo

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
-- Data for Name: constructions; Type: TABLE DATA; Schema: public; Owner: ssanjay
--

INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('a4c41564-1c09-4e6d-9095-19cd8bf64a21', 'Brick Wall with Insulation', 'wall', false, 0.35, 95.5, 620, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('fb21aa60-710b-4936-ae23-50201f0f65bb', 'Concrete Floor', 'floor', false, 0.4, 125.8, 480, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('90aea649-ab68-42d0-b872-45ed04c05b21', 'Insulated Roof', 'roof', false, 0.25, 65.3, 550, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('f0c2b05b-758f-49ce-97ba-2a0067c25fd2', 'Double Glazed Window', 'window', true, 1.8, 55.2, 1200, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('2e9c7fce-6a34-4d77-9535-b7cfef22e61a', 'Triple Glazed Low-E Window', 'window', true, 0.8, 85.6, 2200, NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) VALUES ('e1afc5e3-cd7a-4b52-92e3-d0da5a952ae4', 'Final Test Construction', 'wall', false, 1, 0, 0, NULL, '2025-09-18 13:37:33.896224+02', '2025-09-18 13:37:33.896224+02', 'User Created via API', '2025-09-18 13:37:33.896224+02');


--
-- PostgreSQL database dump complete
--

\unrestrict mr3d4yDONcpbPPOPicsx4g8HdNoaMOMS1DC0HQN9FY0sBM0S7X4cohwcEEibHXo

