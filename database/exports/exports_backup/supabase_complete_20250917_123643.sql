--
-- PostgreSQL database dump
--

\restrict rfbMznXx1Fa7bu31Q47vNCaJlCZfmqbBKSI81WQt75nqka0GxVpUdj6csoigRuz

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.14 (Homebrew)

-- Started on 2025-09-17 12:36:43 CEST

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

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime_messages_publication;
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP POLICY IF EXISTS sets_update_policy ON public.construction_sets;
DROP POLICY IF EXISTS sets_read_policy ON public.construction_sets;
DROP POLICY IF EXISTS sets_insert_policy ON public.construction_sets;
DROP POLICY IF EXISTS sets_delete_policy ON public.construction_sets;
DROP POLICY IF EXISTS materials_update_policy ON public.materials;
DROP POLICY IF EXISTS materials_read_policy ON public.materials;
DROP POLICY IF EXISTS materials_insert_policy ON public.materials;
DROP POLICY IF EXISTS materials_delete_policy ON public.materials;
DROP POLICY IF EXISTS layers_read_policy ON public.layers;
DROP POLICY IF EXISTS layers_manage_policy ON public.layers;
DROP POLICY IF EXISTS glazing_update_policy ON public.window_glazing;
DROP POLICY IF EXISTS glazing_read_policy ON public.window_glazing;
DROP POLICY IF EXISTS glazing_insert_policy ON public.window_glazing;
DROP POLICY IF EXISTS glazing_delete_policy ON public.window_glazing;
DROP POLICY IF EXISTS constructions_update_policy ON public.constructions;
DROP POLICY IF EXISTS constructions_read_policy ON public.constructions;
DROP POLICY IF EXISTS constructions_insert_policy ON public.constructions;
DROP POLICY IF EXISTS constructions_delete_policy ON public.constructions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own scenario results" ON public.scenario_results;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can read own baseline results" ON public.baseline_results;
DROP POLICY IF EXISTS "Users can read all scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Users can read all scenario constructions" ON public.scenario_constructions;
DROP POLICY IF EXISTS "Users can read all layers" ON public.layers;
DROP POLICY IF EXISTS "Users can manage scenario constructions" ON public.scenario_constructions;
DROP POLICY IF EXISTS "Users can manage own simulations" ON public.simulation_runs;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage layers of own constructions" ON public.layers;
DROP POLICY IF EXISTS "Users can insert own scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Users can delete own scenarios" ON public.scenarios;
DROP POLICY IF EXISTS "Users can access own simulation files" ON public.simulation_files;
DROP POLICY IF EXISTS "Enable update for construction set authors" ON public.construction_sets;
DROP POLICY IF EXISTS "Enable read access for all glazing" ON public.window_glazing;
DROP POLICY IF EXISTS "Enable read access for all constructions" ON public.constructions;
DROP POLICY IF EXISTS "Enable read access for all construction sets" ON public.construction_sets;
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.materials;
DROP POLICY IF EXISTS "Enable insert for construction sets" ON public.construction_sets;
DROP POLICY IF EXISTS "Allow admins to manage domains" ON public.allowed_email_domains;
DROP POLICY IF EXISTS "Allow admins to manage allowed emails" ON public.allowed_emails;
ALTER TABLE IF EXISTS ONLY public.window_glazing DROP CONSTRAINT IF EXISTS window_glazing_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_runs DROP CONSTRAINT IF EXISTS simulation_runs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.simulation_files DROP CONSTRAINT IF EXISTS simulation_files_simulation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scenarios DROP CONSTRAINT IF EXISTS scenarios_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scenario_results DROP CONSTRAINT IF EXISTS scenario_results_simulation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scenario_constructions DROP CONSTRAINT IF EXISTS scenario_constructions_scenario_id_fkey;
ALTER TABLE IF EXISTS ONLY public.scenario_constructions DROP CONSTRAINT IF EXISTS scenario_constructions_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.layers DROP CONSTRAINT IF EXISTS layers_material_id_fkey;
ALTER TABLE IF EXISTS ONLY public.layers DROP CONSTRAINT IF EXISTS layers_glazing_id_fkey;
ALTER TABLE IF EXISTS ONLY public.layers DROP CONSTRAINT IF EXISTS layers_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.constructions DROP CONSTRAINT IF EXISTS constructions_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_window_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_wall_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_roof_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_floor_construction_id_fkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_author_id_fkey;
ALTER TABLE IF EXISTS ONLY public.baseline_results DROP CONSTRAINT IF EXISTS baseline_results_simulation_id_fkey;
DROP TRIGGER IF EXISTS update_scenarios_updated_at ON public.scenarios;
DROP INDEX IF EXISTS public.idx_allowed_emails_email;
DROP INDEX IF EXISTS public.idx_allowed_domains_domain;
ALTER TABLE IF EXISTS ONLY public.window_glazing DROP CONSTRAINT IF EXISTS window_glazing_pkey;
ALTER TABLE IF EXISTS ONLY public.window_glazing DROP CONSTRAINT IF EXISTS window_glazing_name_key;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_key_key;
ALTER TABLE IF EXISTS ONLY public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_runs DROP CONSTRAINT IF EXISTS simulation_runs_pkey;
ALTER TABLE IF EXISTS ONLY public.simulation_files DROP CONSTRAINT IF EXISTS simulation_files_pkey;
ALTER TABLE IF EXISTS ONLY public.scenarios DROP CONSTRAINT IF EXISTS scenarios_pkey;
ALTER TABLE IF EXISTS ONLY public.scenario_results DROP CONSTRAINT IF EXISTS scenario_results_pkey;
ALTER TABLE IF EXISTS ONLY public.scenario_constructions DROP CONSTRAINT IF EXISTS scenario_constructions_scenario_id_construction_id_key;
ALTER TABLE IF EXISTS ONLY public.scenario_constructions DROP CONSTRAINT IF EXISTS scenario_constructions_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_pkey;
ALTER TABLE IF EXISTS ONLY public.materials DROP CONSTRAINT IF EXISTS materials_name_key;
ALTER TABLE IF EXISTS ONLY public.layers DROP CONSTRAINT IF EXISTS layers_pkey;
ALTER TABLE IF EXISTS ONLY public.layers DROP CONSTRAINT IF EXISTS layers_construction_id_layer_order_key;
ALTER TABLE IF EXISTS ONLY public.constructions DROP CONSTRAINT IF EXISTS constructions_pkey;
ALTER TABLE IF EXISTS ONLY public.constructions DROP CONSTRAINT IF EXISTS constructions_name_key;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_pkey;
ALTER TABLE IF EXISTS ONLY public.construction_sets DROP CONSTRAINT IF EXISTS construction_sets_name_key;
ALTER TABLE IF EXISTS ONLY public.baseline_results DROP CONSTRAINT IF EXISTS baseline_results_pkey;
ALTER TABLE IF EXISTS ONLY public.allowed_emails DROP CONSTRAINT IF EXISTS allowed_emails_pkey;
ALTER TABLE IF EXISTS ONLY public.allowed_emails DROP CONSTRAINT IF EXISTS allowed_emails_email_key;
ALTER TABLE IF EXISTS ONLY public.allowed_email_domains DROP CONSTRAINT IF EXISTS allowed_email_domains_pkey;
ALTER TABLE IF EXISTS ONLY public.allowed_email_domains DROP CONSTRAINT IF EXISTS allowed_email_domains_domain_key;
DROP TABLE IF EXISTS public.window_glazing;
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.user_profiles;
DROP TABLE IF EXISTS public.user_preferences;
DROP TABLE IF EXISTS public.simulation_runs;
DROP TABLE IF EXISTS public.simulation_files;
DROP TABLE IF EXISTS public.scenarios;
DROP TABLE IF EXISTS public.scenario_results;
DROP TABLE IF EXISTS public.scenario_constructions;
DROP TABLE IF EXISTS public.materials;
DROP TABLE IF EXISTS public.layers;
DROP TABLE IF EXISTS public.constructions;
DROP TABLE IF EXISTS public.construction_sets;
DROP TABLE IF EXISTS public.baseline_results;
DROP TABLE IF EXISTS public.allowed_emails;
DROP TABLE IF EXISTS public.allowed_email_domains;
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.is_email_allowed(check_email text);
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP EXTENSION IF EXISTS pg_graphql;
--
-- TOC entry 3 (class 3079 OID 18170)
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- TOC entry 3917 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- TOC entry 6 (class 3079 OID 17110)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- TOC entry 3918 (class 0 OID 0)
-- Dependencies: 6
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 5 (class 3079 OID 17141)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- TOC entry 3919 (class 0 OID 0)
-- Dependencies: 5
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 2 (class 3079 OID 17178)
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- TOC entry 3920 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- TOC entry 4 (class 3079 OID 17201)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- TOC entry 3921 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 341 (class 1255 OID 17301)
-- Name: is_email_allowed(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_email_allowed(check_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  email_domain TEXT;
BEGIN
  -- Convert email to lowercase for consistent comparison
  check_email := LOWER(check_email);
  
  -- First check if the specific email is allowed
  IF EXISTS (
    SELECT 1 FROM allowed_emails 
    WHERE LOWER(email) = check_email
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Extract domain from email
  email_domain := split_part(check_email, '@', 2);
  
  -- Then check if the domain is allowed
  RETURN EXISTS (
    SELECT 1 FROM allowed_email_domains 
    WHERE LOWER(domain) = email_domain
  );
END;
$$;


--
-- TOC entry 342 (class 1255 OID 17302)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 252 (class 1259 OID 17427)
-- Name: allowed_email_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowed_email_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    domain text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 253 (class 1259 OID 17434)
-- Name: allowed_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.allowed_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 254 (class 1259 OID 17441)
-- Name: baseline_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.baseline_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    building_name text NOT NULL,
    total_floor_area real,
    total_energy_use real,
    heating_demand real,
    cooling_demand real,
    lighting_demand real,
    equipment_demand real,
    results_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 255 (class 1259 OID 17448)
-- Name: construction_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.construction_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    wall_construction_id uuid,
    roof_construction_id uuid,
    floor_construction_id uuid,
    window_construction_id uuid,
    author_id uuid,
    date_created timestamp with time zone DEFAULT now(),
    date_modified timestamp with time zone DEFAULT now(),
    source text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 256 (class 1259 OID 17457)
-- Name: constructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.constructions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    element_type text,
    is_window boolean DEFAULT false,
    u_value_w_m2k real NOT NULL,
    gwp_kgco2e_per_m2 real NOT NULL,
    cost_sek_per_m2 real NOT NULL,
    author_id uuid,
    date_created timestamp with time zone DEFAULT now(),
    date_modified timestamp with time zone DEFAULT now(),
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT constructions_element_type_check CHECK ((element_type = ANY (ARRAY['wall'::text, 'roof'::text, 'floor'::text, 'ceiling'::text, 'window'::text])))
);


--
-- TOC entry 257 (class 1259 OID 17468)
-- Name: layers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    construction_id uuid,
    material_id uuid,
    glazing_id uuid,
    layer_order integer NOT NULL,
    is_glazing_layer boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT layer_material_or_glazing CHECK ((((material_id IS NOT NULL) AND (glazing_id IS NULL)) OR ((material_id IS NULL) AND (glazing_id IS NOT NULL))))
);


--
-- TOC entry 258 (class 1259 OID 17475)
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    roughness text,
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
    author_id uuid,
    date_created timestamp with time zone DEFAULT now(),
    date_modified timestamp with time zone DEFAULT now(),
    source text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT materials_roughness_check CHECK ((roughness = ANY (ARRAY['VeryRough'::text, 'Rough'::text, 'MediumRough'::text, 'MediumSmooth'::text, 'Smooth'::text, 'VerySmooth'::text])))
);


--
-- TOC entry 259 (class 1259 OID 17492)
-- Name: scenario_constructions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_constructions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scenario_id uuid,
    construction_id uuid,
    element_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scenario_constructions_element_type_check CHECK ((element_type = ANY (ARRAY['wall'::text, 'roof'::text, 'floor'::text, 'window'::text])))
);


--
-- TOC entry 260 (class 1259 OID 17500)
-- Name: scenario_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenario_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    scenario_name text NOT NULL,
    construction_details jsonb NOT NULL,
    total_energy_savings real,
    heating_savings real,
    cooling_savings real,
    total_cost real,
    total_gwp real,
    results_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 261 (class 1259 OID 17507)
-- Name: scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    total_simulations integer DEFAULT 0 NOT NULL,
    author_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 262 (class 1259 OID 17516)
-- Name: simulation_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    simulation_id uuid NOT NULL,
    file_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT simulation_files_file_type_check CHECK ((file_type = ANY (ARRAY['idf'::text, 'epw'::text, 'output'::text, 'report'::text])))
);


--
-- TOC entry 263 (class 1259 OID 17524)
-- Name: simulation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.simulation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT simulation_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])))
);


--
-- TOC entry 264 (class 1259 OID 17535)
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 265 (class 1259 OID 17543)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text,
    last_name text,
    organization text,
    role text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 266 (class 1259 OID 17551)
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_start timestamp with time zone DEFAULT now(),
    session_end timestamp with time zone,
    ip_address text,
    user_agent text
);


--
-- TOC entry 267 (class 1259 OID 17558)
-- Name: window_glazing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.window_glazing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    thickness_m real NOT NULL,
    conductivity_w_mk real NOT NULL,
    solar_transmittance real,
    visible_transmittance real,
    infrared_transmittance real DEFAULT 0.0,
    front_ir_emissivity real DEFAULT 0.84,
    back_ir_emissivity real DEFAULT 0.84,
    gwp_kgco2e_per_m2 real NOT NULL,
    cost_sek_per_m2 real NOT NULL,
    author_id uuid,
    date_created timestamp with time zone DEFAULT now(),
    date_modified timestamp with time zone DEFAULT now(),
    source text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- TOC entry 3896 (class 0 OID 17427)
-- Dependencies: 252
-- Data for Name: allowed_email_domains; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.allowed_email_domains (id, domain, description, created_at) FROM stdin;
1598a103-4029-40a7-9e65-1b524b97b71e	chalmers.se	Chalmers University of Technology	2025-05-25 10:17:07.878933+00
\.


--
-- TOC entry 3897 (class 0 OID 17434)
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
-- TOC entry 3898 (class 0 OID 17441)
-- Dependencies: 254
-- Data for Name: baseline_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baseline_results (id, simulation_id, building_name, total_floor_area, total_energy_use, heating_demand, cooling_demand, lighting_demand, equipment_demand, results_json, created_at) FROM stdin;
\.


--
-- TOC entry 3899 (class 0 OID 17448)
-- Dependencies: 255
-- Data for Name: construction_sets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.construction_sets (id, name, description, wall_construction_id, roof_construction_id, floor_construction_id, window_construction_id, author_id, date_created, date_modified, source, created_at) FROM stdin;
1c2c57d4-d4c4-4d5f-af43-86954de76aae	High Performance Set	Energy efficient construction set for passive buildings	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	fb21aa60-710b-4936-ae23-50201f0f65bb	2e9c7fce-6a34-4d77-9535-b7cfef22e61a	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
19b166f6-9746-4099-be02-e436ee6e297b	Budget Friendly Set	Cost-effective construction set with moderate performance	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	\N	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
993f7e5c-ab68-44aa-9199-af60251d5195	Standard Construction Set	Basic construction set for typical buildings	a4c41564-1c09-4e6d-9095-19cd8bf64a21	90aea649-ab68-42d0-b872-45ed04c05b21	fb21aa60-710b-4936-ae23-50201f0f65bb	f0c2b05b-758f-49ce-97ba-2a0067c25fd2	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3900 (class 0 OID 17457)
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
-- TOC entry 3901 (class 0 OID 17468)
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
-- TOC entry 3902 (class 0 OID 17475)
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
-- TOC entry 3903 (class 0 OID 17492)
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
-- TOC entry 3904 (class 0 OID 17500)
-- Dependencies: 260
-- Data for Name: scenario_results; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scenario_results (id, simulation_id, scenario_name, construction_details, total_energy_savings, heating_savings, cooling_savings, total_cost, total_gwp, results_json, created_at) FROM stdin;
\.


--
-- TOC entry 3905 (class 0 OID 17507)
-- Dependencies: 261
-- Data for Name: scenarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scenarios (id, name, description, total_simulations, author_id, created_at, updated_at) FROM stdin;
1e03bac3-a2f1-4688-8609-e14f0846079b	test	test	2	0a96a99c-9ec0-409f-9073-b61781aa64ed	2025-05-27 13:51:37.922286+00	2025-05-27 13:51:37.922286+00
\.


--
-- TOC entry 3906 (class 0 OID 17516)
-- Dependencies: 262
-- Data for Name: simulation_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_files (id, simulation_id, file_type, file_name, file_path, file_size, created_at) FROM stdin;
\.


--
-- TOC entry 3907 (class 0 OID 17524)
-- Dependencies: 263
-- Data for Name: simulation_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.simulation_runs (id, user_id, name, description, status, start_time, end_time, error_message, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3908 (class 0 OID 17535)
-- Dependencies: 264
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_preferences (id, user_id, key, value, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3909 (class 0 OID 17543)
-- Dependencies: 265
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_profiles (id, user_id, first_name, last_name, organization, role, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3910 (class 0 OID 17551)
-- Dependencies: 266
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_sessions (id, user_id, session_start, session_end, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 3911 (class 0 OID 17558)
-- Dependencies: 267
-- Data for Name: window_glazing; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.window_glazing (id, name, thickness_m, conductivity_w_mk, solar_transmittance, visible_transmittance, infrared_transmittance, front_ir_emissivity, back_ir_emissivity, gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, date_created, date_modified, source, created_at) FROM stdin;
48216371-51d2-4277-a6a9-e3821c98fcd3	Clear 3mm	0.003	0.9	0.837	0.898	0	0.84	0.84	25.5	350	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
a515212d-b18b-4944-992a-c4d70a13e6a6	Low-E 6mm	0.006	0.9	0.42	0.71	0	0.84	0.84	35.8	620	\N	2025-05-25 10:40:12.90199+00	2025-05-25 10:40:12.90199+00	\N	2025-05-25 10:40:12.90199+00
c3e031ee-d9f3-4069-a712-d241ebeedfc8	Triple Low-E 4mm	0.004	0.9	0.33	0.65	0	0.84	0.84	42.3	780	\N	2025-05-25 12:56:06.655458+00	2025-05-25 12:56:06.655458+00	\N	2025-05-25 12:56:06.655458+00
\.


--
-- TOC entry 3617 (class 2606 OID 17741)
-- Name: allowed_email_domains allowed_email_domains_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_email_domains
    ADD CONSTRAINT allowed_email_domains_domain_key UNIQUE (domain);


--
-- TOC entry 3619 (class 2606 OID 17743)
-- Name: allowed_email_domains allowed_email_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_email_domains
    ADD CONSTRAINT allowed_email_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 3622 (class 2606 OID 17745)
-- Name: allowed_emails allowed_emails_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_emails
    ADD CONSTRAINT allowed_emails_email_key UNIQUE (email);


--
-- TOC entry 3624 (class 2606 OID 17747)
-- Name: allowed_emails allowed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.allowed_emails
    ADD CONSTRAINT allowed_emails_pkey PRIMARY KEY (id);


--
-- TOC entry 3627 (class 2606 OID 17749)
-- Name: baseline_results baseline_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baseline_results
    ADD CONSTRAINT baseline_results_pkey PRIMARY KEY (id);


--
-- TOC entry 3629 (class 2606 OID 17751)
-- Name: construction_sets construction_sets_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_name_key UNIQUE (name);


--
-- TOC entry 3631 (class 2606 OID 17753)
-- Name: construction_sets construction_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_pkey PRIMARY KEY (id);


--
-- TOC entry 3633 (class 2606 OID 17755)
-- Name: constructions constructions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constructions
    ADD CONSTRAINT constructions_name_key UNIQUE (name);


--
-- TOC entry 3635 (class 2606 OID 17757)
-- Name: constructions constructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constructions
    ADD CONSTRAINT constructions_pkey PRIMARY KEY (id);


--
-- TOC entry 3637 (class 2606 OID 17759)
-- Name: layers layers_construction_id_layer_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layers
    ADD CONSTRAINT layers_construction_id_layer_order_key UNIQUE (construction_id, layer_order);


--
-- TOC entry 3639 (class 2606 OID 17761)
-- Name: layers layers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layers
    ADD CONSTRAINT layers_pkey PRIMARY KEY (id);


--
-- TOC entry 3641 (class 2606 OID 17763)
-- Name: materials materials_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_name_key UNIQUE (name);


--
-- TOC entry 3643 (class 2606 OID 17765)
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- TOC entry 3645 (class 2606 OID 17767)
-- Name: scenario_constructions scenario_constructions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_constructions
    ADD CONSTRAINT scenario_constructions_pkey PRIMARY KEY (id);


--
-- TOC entry 3647 (class 2606 OID 17769)
-- Name: scenario_constructions scenario_constructions_scenario_id_construction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_constructions
    ADD CONSTRAINT scenario_constructions_scenario_id_construction_id_key UNIQUE (scenario_id, construction_id);


--
-- TOC entry 3649 (class 2606 OID 17771)
-- Name: scenario_results scenario_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_results
    ADD CONSTRAINT scenario_results_pkey PRIMARY KEY (id);


--
-- TOC entry 3651 (class 2606 OID 17773)
-- Name: scenarios scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_pkey PRIMARY KEY (id);


--
-- TOC entry 3653 (class 2606 OID 17775)
-- Name: simulation_files simulation_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_files
    ADD CONSTRAINT simulation_files_pkey PRIMARY KEY (id);


--
-- TOC entry 3655 (class 2606 OID 17777)
-- Name: simulation_runs simulation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_runs
    ADD CONSTRAINT simulation_runs_pkey PRIMARY KEY (id);


--
-- TOC entry 3657 (class 2606 OID 17779)
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- TOC entry 3659 (class 2606 OID 17781)
-- Name: user_preferences user_preferences_user_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key_key UNIQUE (user_id, key);


--
-- TOC entry 3661 (class 2606 OID 17783)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3663 (class 2606 OID 17785)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3665 (class 2606 OID 17787)
-- Name: window_glazing window_glazing_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.window_glazing
    ADD CONSTRAINT window_glazing_name_key UNIQUE (name);


--
-- TOC entry 3667 (class 2606 OID 17789)
-- Name: window_glazing window_glazing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.window_glazing
    ADD CONSTRAINT window_glazing_pkey PRIMARY KEY (id);


--
-- TOC entry 3620 (class 1259 OID 17862)
-- Name: idx_allowed_domains_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allowed_domains_domain ON public.allowed_email_domains USING btree (lower(domain));


--
-- TOC entry 3625 (class 1259 OID 17863)
-- Name: idx_allowed_emails_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_allowed_emails_email ON public.allowed_emails USING btree (lower(email));


--
-- TOC entry 3689 (class 2620 OID 17871)
-- Name: scenarios update_scenarios_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3668 (class 2606 OID 17929)
-- Name: baseline_results baseline_results_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baseline_results
    ADD CONSTRAINT baseline_results_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_runs(id);


--
-- TOC entry 3669 (class 2606 OID 17934)
-- Name: construction_sets construction_sets_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- TOC entry 3670 (class 2606 OID 17939)
-- Name: construction_sets construction_sets_floor_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_floor_construction_id_fkey FOREIGN KEY (floor_construction_id) REFERENCES public.constructions(id);


--
-- TOC entry 3671 (class 2606 OID 17944)
-- Name: construction_sets construction_sets_roof_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_roof_construction_id_fkey FOREIGN KEY (roof_construction_id) REFERENCES public.constructions(id);


--
-- TOC entry 3672 (class 2606 OID 17949)
-- Name: construction_sets construction_sets_wall_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_wall_construction_id_fkey FOREIGN KEY (wall_construction_id) REFERENCES public.constructions(id);


--
-- TOC entry 3673 (class 2606 OID 17954)
-- Name: construction_sets construction_sets_window_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.construction_sets
    ADD CONSTRAINT construction_sets_window_construction_id_fkey FOREIGN KEY (window_construction_id) REFERENCES public.constructions(id);


--
-- TOC entry 3674 (class 2606 OID 17959)
-- Name: constructions constructions_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.constructions
    ADD CONSTRAINT constructions_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- TOC entry 3675 (class 2606 OID 17964)
-- Name: layers layers_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layers
    ADD CONSTRAINT layers_construction_id_fkey FOREIGN KEY (construction_id) REFERENCES public.constructions(id) ON DELETE CASCADE;


--
-- TOC entry 3676 (class 2606 OID 17969)
-- Name: layers layers_glazing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layers
    ADD CONSTRAINT layers_glazing_id_fkey FOREIGN KEY (glazing_id) REFERENCES public.window_glazing(id);


--
-- TOC entry 3677 (class 2606 OID 17974)
-- Name: layers layers_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layers
    ADD CONSTRAINT layers_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- TOC entry 3678 (class 2606 OID 17979)
-- Name: materials materials_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- TOC entry 3679 (class 2606 OID 17984)
-- Name: scenario_constructions scenario_constructions_construction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_constructions
    ADD CONSTRAINT scenario_constructions_construction_id_fkey FOREIGN KEY (construction_id) REFERENCES public.constructions(id);


--
-- TOC entry 3680 (class 2606 OID 17989)
-- Name: scenario_constructions scenario_constructions_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_constructions
    ADD CONSTRAINT scenario_constructions_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id) ON DELETE CASCADE;


--
-- TOC entry 3681 (class 2606 OID 17994)
-- Name: scenario_results scenario_results_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenario_results
    ADD CONSTRAINT scenario_results_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_runs(id);


--
-- TOC entry 3682 (class 2606 OID 17999)
-- Name: scenarios scenarios_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scenarios
    ADD CONSTRAINT scenarios_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- TOC entry 3683 (class 2606 OID 18004)
-- Name: simulation_files simulation_files_simulation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_files
    ADD CONSTRAINT simulation_files_simulation_id_fkey FOREIGN KEY (simulation_id) REFERENCES public.simulation_runs(id);


--
-- TOC entry 3684 (class 2606 OID 18009)
-- Name: simulation_runs simulation_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulation_runs
    ADD CONSTRAINT simulation_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- TOC entry 3685 (class 2606 OID 18014)
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- TOC entry 3686 (class 2606 OID 18019)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- TOC entry 3687 (class 2606 OID 18024)
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- TOC entry 3688 (class 2606 OID 18029)
-- Name: window_glazing window_glazing_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.window_glazing
    ADD CONSTRAINT window_glazing_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- TOC entry 3851 (class 3256 OID 18054)
-- Name: allowed_emails Allow admins to manage allowed emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to manage allowed emails" ON public.allowed_emails TO authenticated USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- TOC entry 3852 (class 3256 OID 18055)
-- Name: allowed_email_domains Allow admins to manage domains; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to manage domains" ON public.allowed_email_domains TO authenticated USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- TOC entry 3853 (class 3256 OID 18056)
-- Name: construction_sets Enable insert for construction sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable insert for construction sets" ON public.construction_sets FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3854 (class 3256 OID 18057)
-- Name: materials Enable read access for all authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all authenticated users" ON public.materials FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3855 (class 3256 OID 18058)
-- Name: construction_sets Enable read access for all construction sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all construction sets" ON public.construction_sets FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3856 (class 3256 OID 18059)
-- Name: constructions Enable read access for all constructions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all constructions" ON public.constructions FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3857 (class 3256 OID 18060)
-- Name: window_glazing Enable read access for all glazing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all glazing" ON public.window_glazing FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3858 (class 3256 OID 18061)
-- Name: construction_sets Enable update for construction set authors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable update for construction set authors" ON public.construction_sets FOR UPDATE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid))) WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3859 (class 3256 OID 18062)
-- Name: simulation_files Users can access own simulation files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can access own simulation files" ON public.simulation_files TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.simulation_runs
  WHERE ((simulation_runs.id = simulation_files.simulation_id) AND (simulation_runs.user_id = auth.uid())))));


--
-- TOC entry 3860 (class 3256 OID 18063)
-- Name: scenarios Users can delete own scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own scenarios" ON public.scenarios FOR DELETE TO authenticated USING ((auth.uid() = author_id));


--
-- TOC entry 3861 (class 3256 OID 18064)
-- Name: scenarios Users can insert own scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own scenarios" ON public.scenarios FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));


--
-- TOC entry 3862 (class 3256 OID 18065)
-- Name: layers Users can manage layers of own constructions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage layers of own constructions" ON public.layers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.constructions
  WHERE ((constructions.id = layers.construction_id) AND (constructions.author_id = auth.uid())))));


--
-- TOC entry 3863 (class 3256 OID 18066)
-- Name: user_preferences Users can manage own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own preferences" ON public.user_preferences TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3864 (class 3256 OID 18067)
-- Name: simulation_runs Users can manage own simulations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own simulations" ON public.simulation_runs TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3865 (class 3256 OID 18068)
-- Name: scenario_constructions Users can manage scenario constructions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage scenario constructions" ON public.scenario_constructions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.scenarios
  WHERE ((scenarios.id = scenario_constructions.scenario_id) AND (scenarios.author_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.scenarios
  WHERE ((scenarios.id = scenario_constructions.scenario_id) AND (scenarios.author_id = auth.uid())))));


--
-- TOC entry 3866 (class 3256 OID 18070)
-- Name: layers Users can read all layers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read all layers" ON public.layers FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3867 (class 3256 OID 18071)
-- Name: scenario_constructions Users can read all scenario constructions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read all scenario constructions" ON public.scenario_constructions FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3868 (class 3256 OID 18072)
-- Name: scenarios Users can read all scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read all scenarios" ON public.scenarios FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3869 (class 3256 OID 18073)
-- Name: baseline_results Users can read own baseline results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own baseline results" ON public.baseline_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.simulation_runs
  WHERE ((simulation_runs.id = baseline_results.simulation_id) AND (simulation_runs.user_id = auth.uid())))));


--
-- TOC entry 3870 (class 3256 OID 18074)
-- Name: user_preferences Users can read own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own preferences" ON public.user_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3871 (class 3256 OID 18075)
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3872 (class 3256 OID 18076)
-- Name: scenario_results Users can read own scenario results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own scenario results" ON public.scenario_results FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.simulation_runs
  WHERE ((simulation_runs.id = scenario_results.simulation_id) AND (simulation_runs.user_id = auth.uid())))));


--
-- TOC entry 3873 (class 3256 OID 18077)
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3874 (class 3256 OID 18078)
-- Name: scenarios Users can update own scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own scenarios" ON public.scenarios FOR UPDATE TO authenticated USING ((auth.uid() = author_id)) WITH CHECK ((auth.uid() = author_id));


--
-- TOC entry 3875 (class 3256 OID 18079)
-- Name: user_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.user_sessions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 3835 (class 0 OID 17427)
-- Dependencies: 252
-- Name: allowed_email_domains; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3836 (class 0 OID 17434)
-- Dependencies: 253
-- Name: allowed_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3837 (class 0 OID 17441)
-- Dependencies: 254
-- Name: baseline_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.baseline_results ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3838 (class 0 OID 17448)
-- Dependencies: 255
-- Name: construction_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.construction_sets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3839 (class 0 OID 17457)
-- Dependencies: 256
-- Name: constructions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.constructions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3876 (class 3256 OID 18080)
-- Name: constructions constructions_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY constructions_delete_policy ON public.constructions FOR DELETE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3877 (class 3256 OID 18081)
-- Name: constructions constructions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY constructions_insert_policy ON public.constructions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3878 (class 3256 OID 18082)
-- Name: constructions constructions_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY constructions_read_policy ON public.constructions FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3879 (class 3256 OID 18083)
-- Name: constructions constructions_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY constructions_update_policy ON public.constructions FOR UPDATE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid))) WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3880 (class 3256 OID 18084)
-- Name: window_glazing glazing_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY glazing_delete_policy ON public.window_glazing FOR DELETE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3881 (class 3256 OID 18085)
-- Name: window_glazing glazing_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY glazing_insert_policy ON public.window_glazing FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3882 (class 3256 OID 18086)
-- Name: window_glazing glazing_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY glazing_read_policy ON public.window_glazing FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3883 (class 3256 OID 18087)
-- Name: window_glazing glazing_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY glazing_update_policy ON public.window_glazing FOR UPDATE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid))) WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3840 (class 0 OID 17468)
-- Dependencies: 257
-- Name: layers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.layers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3884 (class 3256 OID 18088)
-- Name: layers layers_manage_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY layers_manage_policy ON public.layers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.constructions c
  WHERE ((c.id = layers.construction_id) AND ((c.author_id = auth.uid()) OR (c.author_id = '00000000-0000-0000-0000-000000000000'::uuid))))));


--
-- TOC entry 3885 (class 3256 OID 18089)
-- Name: layers layers_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY layers_read_policy ON public.layers FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3841 (class 0 OID 17475)
-- Dependencies: 258
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3886 (class 3256 OID 18090)
-- Name: materials materials_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_delete_policy ON public.materials FOR DELETE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3887 (class 3256 OID 18091)
-- Name: materials materials_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_insert_policy ON public.materials FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3888 (class 3256 OID 18092)
-- Name: materials materials_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_read_policy ON public.materials FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3889 (class 3256 OID 18093)
-- Name: materials materials_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY materials_update_policy ON public.materials FOR UPDATE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid))) WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3842 (class 0 OID 17492)
-- Dependencies: 259
-- Name: scenario_constructions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenario_constructions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3843 (class 0 OID 17500)
-- Dependencies: 260
-- Name: scenario_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenario_results ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3844 (class 0 OID 17507)
-- Dependencies: 261
-- Name: scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3890 (class 3256 OID 18094)
-- Name: construction_sets sets_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sets_delete_policy ON public.construction_sets FOR DELETE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3891 (class 3256 OID 18095)
-- Name: construction_sets sets_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sets_insert_policy ON public.construction_sets FOR INSERT TO authenticated WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3892 (class 3256 OID 18096)
-- Name: construction_sets sets_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sets_read_policy ON public.construction_sets FOR SELECT TO authenticated USING (true);


--
-- TOC entry 3893 (class 3256 OID 18097)
-- Name: construction_sets sets_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sets_update_policy ON public.construction_sets FOR UPDATE TO authenticated USING (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid))) WITH CHECK (((auth.uid() = author_id) OR (author_id = '00000000-0000-0000-0000-000000000000'::uuid)));


--
-- TOC entry 3845 (class 0 OID 17516)
-- Dependencies: 262
-- Name: simulation_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_files ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3846 (class 0 OID 17524)
-- Dependencies: 263
-- Name: simulation_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3847 (class 0 OID 17535)
-- Dependencies: 264
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3848 (class 0 OID 17543)
-- Dependencies: 265
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3849 (class 0 OID 17551)
-- Dependencies: 266
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3850 (class 0 OID 17558)
-- Dependencies: 267
-- Name: window_glazing; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.window_glazing ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3894 (class 6104 OID 18098)
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- TOC entry 3895 (class 6104 OID 18099)
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- TOC entry 3544 (class 3466 OID 18143)
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- TOC entry 3549 (class 3466 OID 18181)
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- TOC entry 3543 (class 3466 OID 18142)
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- TOC entry 3550 (class 3466 OID 18182)
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- TOC entry 3545 (class 3466 OID 18144)
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- TOC entry 3546 (class 3466 OID 18145)
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


-- Completed on 2025-09-17 12:36:47 CEST

--
-- PostgreSQL database dump complete
--

\unrestrict rfbMznXx1Fa7bu31Q47vNCaJlCZfmqbBKSI81WQt75nqka0GxVpUdj6csoigRuz

