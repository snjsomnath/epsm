--
-- PostgreSQL database dump
--

\restrict sbdy5Ik746calTsqX6qjcrarFYmYKmFVjg2gfMBTvWjlgzApu23SHEHscvS8LUT

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.14 (Homebrew)

-- Started on 2025-09-17 12:36:50 CEST

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
-- TOC entry 3831 (class 0 OID 17427)
-- Dependencies: 252
-- Data for Name: allowed_email_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowed_email_domains (id, domain, description, created_at) FROM stdin;
1598a103-4029-40a7-9e65-1b524b97b71e	chalmers.se	Chalmers University of Technology	2025-05-25 10:17:07.878933+00
\.


--
-- TOC entry 3832 (class 0 OID 17434)
-- Dependencies: 253
-- Data for Name: allowed_emails; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowed_emails (id, email, description, created_at) FROM stdin;
7c9782cb-c121-4b4f-91e4-6aa05032cd2b	sanjay.somanath@chalmers.se	Sanjay Somanath	2025-05-25 10:21:25.635933+00
c186a0a7-85c1-45c8-86f0-6304111d896f	alexander.hollberg@chalmers.se	Alexander Hollberg	2025-05-25 10:21:25.635933+00
34f675bf-ebf5-40a0-8622-d4b937c3377b	saraabo@chalmers.se	Sara Abouebeid	2025-05-25 10:21:25.635933+00
f6a59483-cdd1-4ecc-9783-c4aa348fed68	ssanjay@chalmers.se	Sanjay Somanath	2025-05-25 10:21:25.635933+00
f87eb331-798c-436f-b378-4f3825c5992b	demo@chalmers.se	Demo Account	2025-05-25 10:29:21.642855+00
\.


--
-- TOC entry 3842 (class 0 OID 17524)
-- Dependencies: 263
-- Data for Name: simulation_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_runs (id, user_id, name, description, status, start_time, end_time, error_message, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3833 (class 0 OID 17441)
-- Dependencies: 254
-- Data for Name: baseline_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baseline_results (id, simulation_id, building_name, total_floor_area, total_energy_use, heating_demand, cooling_demand, lighting_demand, equipment_demand, results_json, created_at) FROM stdin;
\.


--
-- TOC entry 3835 (class 0 OID 17457)
-- Dependencies: 256
-- Data for Name: constructions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.constructions (id, name, element_type, is_window, u_value_w_m2k, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) FROM stdin;
a4c41564-1c09-4e6d-9095-19cd8bf64a21	Brick Wall with Insulation	wall	f	0.35	95.5	620	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
fb21aa60-710b-4936-ae23-50201f0f65bb	Concrete Floor	floor	f	0.4	125.8	480	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
90aea649-ab68-42d0-b872-45ed04c05b21	Insulated Roof	roof	f	0.25	65.3	550	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
f0c2b05b-758f-49ce-97ba-2a0067c25fd2	Double Glazed Window	window	t	1.8	55.2	1200	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
2e9c7fce-6a34-4d77-9535-b7cfef22e61a	Triple Glazed Low-E Window	window	t	0.8	85.6	2200	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3834 (class 0 OID 17448)
-- Dependencies: 255
-- Data for Name: construction_sets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) FROM stdin;
1c2c57d4-d4c4-4d5f-af43-86954de76aae	High Performance Set	Energy efficient construction set for passive buildings	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	fb21aa60-710b-4936-ae23-50201f0f65bb	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
19b166f6-9746-4099-be02-e436ee6e297b	Budget Friendly Set	Cost-effective construction set with moderate performance	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	\N	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
993f7e5c-ab68-44aa-9199-af60251d5195	Standard Construction Set	Basic construction set for typical buildings	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	fb21aa60-710b-4936-ae23-50201f0f65bb	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3837 (class 0 OID 17475)
-- Dependencies: 258
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.materials (id, name, roughness, thickness_m, conductivity_w_mk, density_kg_m3, specific_heat_j_kgk, thermal_absorptance, solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed, window_layer_allowed, author_id, date_created, date_modified, source, created_at) FROM stdin;
c4cc73d9-ff3e-4ef4-b5b5-cf4eb517c1ab	Brick	MediumRough	0.1016	0.89	1920	790	0.9	0.7	0.7	85.2	450	t	f	f	f	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
482ea462-0e92-4a97-aad4-a4af99dfc9df	Insulation Fiberglass	MediumRough	0.0889	0.043	12	840	0.9	0.7	0.7	12.5	120	t	t	t	f	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
647d1be6-7899-4ac5-8b4c-05551db16b6d	Concrete Block	MediumRough	0.2032	0.51	1400	1000	0.9	0.7	0.7	120.4	380	t	f	t	f	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
c16e762e-08b4-4221-84d8-5def42b6e2c7	Gypsum Board	Smooth	0.0127	0.16	800	1090	0.9	0.7	0.7	7.2	85	t	t	f	f	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
9a29b2a4-8eba-4c86-9dbd-829014c09765	Wood Siding	MediumSmooth	0.0191	0.14	530	900	0.9	0.7	0.7	8.3	175	t	f	f	f	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
54623324-adf4-4c5c-aca7-3529f915b951	6 in. Normalweight Concrete Floor	MediumRough	0.1524	2.3084552	2322.0054	831.46356	0.9	0.7	0.7	0	0	t	t	t	f	0a96a99c-9ec0-409f-9073-b61781aa64ed	2025-06-10 11:21:35.212467+00	2025-06-10 11:21:35.212467+00	Extracted from clean.idf	2025-06-10 11:21:35.212467+00
\.


--
-- TOC entry 3846 (class 0 OID 17558)
-- Dependencies: 267
-- Data for Name: window_glazing; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.window_glazing (id, name, thickness_m, conductivity_w_mk, solar_transmittance, visible_transmittance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) FROM stdin;
48216371-51d2-4277-a6a9-e3821c98fcd3	Clear 3mm	0.003	0.9	0.837	0.898	0	0.84	0.84	25.5	350	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
a515212d-b18b-4944-992a-c4d70a13e6a6	Low-E 6mm	0.006	0.9	0.42	0.71	0	0.84	0.84	35.8	620	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
c3e031ee-d9f3-4069-a712-d241ebeedfc8	Triple Low-E 4mm	0.004	0.9	0.33	0.65	0	0.84	0.84	42.3	780	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3836 (class 0 OID 17468)
-- Dependencies: 257
-- Data for Name: layers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.layers (id, construction_id, material_id, glazing_id, layer_order, is_glazing_layer, created_at) FROM stdin;
871b4804-67cb-45b5-8272-a2c81f5d2a76	a4c41564-1c09-4e6d-9095-19cd8bf64a21	c4cc73d9-ff3e-4ef4-b5b5-cf4eb517c1ab	\N	1	f	2025-05-25 12:56:06.655458+00
f990d743-b7e9-4b75-8e74-8ff8811ddd5a	a4c41564-1c09-4e6d-9095-19cd8bf64a21	482ea462-0e92-4a97-aad4-a4af99dfc9df	\N	2	f	2025-05-25 12:56:06.655458+00
cf188450-5065-4d5b-8583-49d066ec588f	a4c41564-1c09-4e6d-9095-19cd8bf64a21	c16e762e-08b4-4221-84d8-5def42b6e2c7	\N	3	f	2025-05-25 12:56:06.655458+00
e9f57d01-4203-488e-9f4f-5d69094d50ea	fb21aa60-710b-4936-ae23-50201f0f65bb	647d1be6-7899-4ac5-8b4c-05551db16b6d	\N	1	f	2025-05-25 12:56:06.655458+00
98a21856-0364-4e8c-b211-09d9d6d41279	fb21aa60-710b-4936-ae23-50201f0f65bb	482ea462-0e92-4a97-aad4-a4af99dfc9df	\N	2	f	2025-05-25 12:56:06.655458+00
26c69f01-9723-4d2f-83fd-0ae7978cb559	90aea649-ab68-42d0-b872-45ed04c05b21	9a29b2a4-8eba-4c86-9dbd-829014c09765	\N	1	f	2025-05-25 12:56:06.655458+00
aae646cf-5cfb-4a64-99be-9ffa8cde65fc	90aea649-ab68-42d0-b872-45ed04c05b21	482ea462-0e92-4a97-aad4-a4af99dfc9df	\N	2	f	2025-05-25 12:56:06.655458+00
5b1609c7-3ca5-439b-a0f5-5cf83feae8a5	90aea649-ab68-42d0-b872-45ed04c05b21	c16e762e-08b4-4221-84d8-5def42b6e2c7	\N	3	f	2025-05-25 12:56:06.655458+00
d94997b2-5934-4231-8b47-a42ca1a3b9b2	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	48216371-51d2-4277-a6a9-e3821c98fcd3	1	t	2025-05-25 12:56:06.655458+00
e864e6f0-cd42-4fe0-a7e9-a430d4f29512	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	48216371-51d2-4277-a6a9-e3821c98fcd3	2	t	2025-05-25 12:56:06.655458+00
9e127208-6305-4f72-bef9-767258cc89e9	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	\N	a515212d-b18b-4944-992a-c4d70a13e6a6	1	t	2025-05-25 12:56:06.655458+00
0f0e0d7b-04c7-4615-9d32-272a1e7c9c78	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	\N	48216371-51d2-4277-a6a9-e3821c98fcd3	2	t	2025-05-25 12:56:06.655458+00
d4377e08-50ff-4066-85f8-5d8d398c6ecd	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	\N	a515212d-b18b-4944-992a-c4d70a13e6a6	3	t	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3840 (class 0 OID 17507)
-- Dependencies: 261
-- Data for Name: scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scenarios (id, name, description, total_simulations, author_id, created_at, updated_at) FROM stdin;
1e03bac3-a2f1-4688-8609-e14f0846079b	test	test	2	0a96a99c-9ec0-409f-9073-b61781aa64ed	2025-05-27 13:51:37.922286+00	2025-05-27 13:51:37.922286+00
\.


--
-- TOC entry 3838 (class 0 OID 17492)
-- Dependencies: 259
-- Data for Name: scenario_constructions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scenario_constructions (id, scenario_id, construction_id, element_type, created_at) FROM stdin;
bc56601f-64ea-4302-a254-45f797f00e1a	1e03bac3-a2f1-4688-8609-e14f0846079b	a4c41564-1c09-4e6d-9095-19cd8bf64a21	wall	2025-05-27 13:51:38.006496+00
085131c3-c362-4d8f-9365-e2bf62d5a555	1e03bac3-a2f1-4688-8609-e14f0846079b	90aea649-ab68-42d0-b872-45ed04c05b21	roof	2025-05-27 13:51:38.006496+00
24b3a3e6-1f37-4396-a8c2-9f8885e1cf0b	1e03bac3-a2f1-4688-8609-e14f0846079b	fb21aa60-710b-4936-ae23-50201f0f65bb	floor	2025-05-27 13:51:38.006496+00
e4230847-8899-4839-bc8b-4ce9d4042f6d	1e03bac3-a2f1-4688-8609-e14f0846079b	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	window	2025-05-27 13:51:38.006496+00
02af571c-382b-4d5f-96ce-e137b9ff34ee	1e03bac3-a2f1-4688-8609-e14f0846079b	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	window	2025-05-27 13:51:38.006496+00
\.


--
-- TOC entry 3839 (class 0 OID 17500)
-- Dependencies: 260
-- Data for Name: scenario_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scenario_results (id, simulation_id, scenario_name, construction_details, total_energy_savings, heating_savings, cooling_savings, total_cost, total_gwp, results_json, created_at) FROM stdin;
\.


--
-- TOC entry 3841 (class 0 OID 17516)
-- Dependencies: 262
-- Data for Name: simulation_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_files (id, simulation_id, file_type, file_name, file_path, file_size, created_at) FROM stdin;
\.


--
-- TOC entry 3843 (class 0 OID 17535)
-- Dependencies: 264
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, user_id, key, value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3844 (class 0 OID 17543)
-- Dependencies: 265
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, first_name, last_name, organization, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3845 (class 0 OID 17551)
-- Dependencies: 266
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, session_start, session_end, ip_address, user_agent) FROM stdin;
\.


-- Completed on 2025-09-17 12:36:52 CEST

--
-- PostgreSQL database dump complete
--

\unrestrict sbdy5Ik746calTsqX6qjcrarFYmYKmFVjg2gfMBTvWjlgzApu23SHEHscvS8LUT

