--
-- PostgreSQL database dump
--

\restrict KfDRzm2X39hwJiNPt5GvjVhfvs6nG5Ce7Fhz22iKQDQPBtPqXAc2HyJ4grXnCOe

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
-- Data for Name: construction_sets; Type: TABLE DATA; Schema: public; Owner: ssanjay
--

INSERT INTO public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) VALUES ('1c2c57d4-d4c4-4d5f-af43-86954de76aae', 'High Performance Set', 'Energy efficient construction set for passive buildings', 'a4c41564-1c09-4e6d-9095-19cd8bf64a21', '90aea649-ab68-42d0-b872-45ed04c05b21', 'fb21aa60-710b-4936-ae23-50201f0f65bb', '2e9c7fce-6a34-4d77-9535-b7cfef22e61a', NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) VALUES ('993f7e5c-ab68-44aa-9199-af60251d5195', 'Standard Construction Set', 'Basic construction set for typical buildings', 'a4c41564-1c09-4e6d-9095-19cd8bf64a21', '90aea649-ab68-42d0-b872-45ed04c05b21', 'fb21aa60-710b-4936-ae23-50201f0f65bb', 'f0c2b05b-758f-49ce-97ba-2a0067c25fd2', NULL, '2025-05-25 14:56:06.655458+02', '2025-05-25 14:56:06.655458+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) VALUES ('a1b0f784-4d92-48b1-9c6e-e4843e0c8a56', 'Final Test Construction Set', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-18 13:37:33.999076+02', '2025-09-18 13:37:33.999076+02', 'User Created via API', '2025-09-18 13:37:33.999076+02');
INSERT INTO public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) VALUES ('19b166f6-9746-4099-be02-e436ee6e297b', 'Budget Friendly Set', 'Cost-effective construction set with moderate performance', 'a4c41564-1c09-4e6d-9095-19cd8bf64a21', '90aea649-ab68-42d0-b872-45ed04c05b21', NULL, 'f0c2b05b-758f-49ce-97ba-2a0067c25fd2', NULL, '2025-05-25 14:56:06.655458+02', '2025-09-18 13:38:21+02', NULL, '2025-05-25 14:56:06.655458+02');
INSERT INTO public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) VALUES ('0775edb3-63a9-4141-9b56-096f5735d2c2', 'Budget Friendly Set Test', 'Cost-effective construction set with moderate performance', 'a4c41564-1c09-4e6d-9095-19cd8bf64a21', '90aea649-ab68-42d0-b872-45ed04c05b21', NULL, 'f0c2b05b-758f-49ce-97ba-2a0067c25fd2', NULL, '2025-09-18 13:42:05.885861+02', '2025-09-18 13:42:05.885861+02', 'User Created via API', '2025-09-18 13:42:05.885861+02');


--
-- PostgreSQL database dump complete
--

\unrestrict KfDRzm2X39hwJiNPt5GvjVhfvs6nG5Ce7Fhz22iKQDQPBtPqXAc2HyJ4grXnCOe

