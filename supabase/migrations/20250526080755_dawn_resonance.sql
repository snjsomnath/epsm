/*
  # Add Scenario Management Tables

  1. New Tables
    - scenarios
      - id (uuid, primary key)
      - name (text)
      - description (text)
      - total_simulations (integer)
      - author_id (uuid, references users)
      - created_at (timestamptz)
      - updated_at (timestamptz)
    
    - scenario_constructions
      - id (uuid, primary key)
      - scenario_id (uuid, references scenarios)
      - construction_id (uuid, references constructions)
      - element_type (text)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own scenarios
*/

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  total_simulations integer NOT NULL DEFAULT 0,
  author_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create scenario_constructions table
CREATE TABLE IF NOT EXISTS scenario_constructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES scenarios(id) ON DELETE CASCADE,
  construction_id uuid REFERENCES constructions(id),
  element_type text NOT NULL CHECK (element_type IN ('wall', 'roof', 'floor', 'window')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (scenario_id, construction_id)
);

-- Enable RLS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_constructions ENABLE ROW LEVEL SECURITY;

-- Policies for scenarios
CREATE POLICY "Users can read all scenarios"
  ON scenarios
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own scenarios"
  ON scenarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own scenarios"
  ON scenarios
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own scenarios"
  ON scenarios
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Policies for scenario_constructions
CREATE POLICY "Users can read all scenario constructions"
  ON scenario_constructions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage scenario constructions"
  ON scenario_constructions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM scenarios
    WHERE scenarios.id = scenario_constructions.scenario_id
    AND scenarios.author_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenarios
    WHERE scenarios.id = scenario_constructions.scenario_id
    AND scenarios.author_id = auth.uid()
  ));

-- Add updated_at trigger for scenarios
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();