/*
  # Simulation Results Schema

  1. New Tables
    - `simulation_runs`: Tracks simulation execution and status
    - `baseline_results`: Stores baseline simulation results
    - `scenario_results`: Stores scenario comparison results
    - `simulation_files`: Manages simulation input/output files

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
*/

CREATE TABLE simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE baseline_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulation_runs NOT NULL,
  building_name TEXT NOT NULL,
  total_floor_area REAL,
  total_energy_use REAL,
  heating_demand REAL,
  cooling_demand REAL,
  lighting_demand REAL,
  equipment_demand REAL,
  results_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scenario_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulation_runs NOT NULL,
  scenario_name TEXT NOT NULL,
  construction_details JSONB NOT NULL, -- Store construction references as JSON instead of foreign keys
  total_energy_savings REAL,
  heating_savings REAL,
  cooling_savings REAL,
  total_cost REAL,
  total_gwp REAL,
  results_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE simulation_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES simulation_runs NOT NULL,
  file_type TEXT CHECK (file_type IN ('idf', 'epw', 'output', 'report')) NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_files ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own simulations"
  ON simulation_runs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own baseline results"
  ON baseline_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulation_runs
      WHERE simulation_runs.id = baseline_results.simulation_id
      AND simulation_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own scenario results"
  ON scenario_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulation_runs
      WHERE simulation_runs.id = scenario_results.simulation_id
      AND simulation_runs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access own simulation files"
  ON simulation_files FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM simulation_runs
      WHERE simulation_runs.id = simulation_files.simulation_id
      AND simulation_runs.user_id = auth.uid()
    )
  );