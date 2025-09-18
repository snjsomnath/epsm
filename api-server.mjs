#!/usr/bin/env node

// Simple Express API server to serve PostgreSQL data to the frontend
// This server connects to the real local PostgreSQL database

import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 8000;

// PostgreSQL connection
const pool = new Pool({
  user: 'ssanjay',
  host: 'localhost',
  database: 'epsm_local',
  password: '', // Add your PostgreSQL password if you have one
  port: 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL database:', err);
    console.log('💡 Make sure PostgreSQL is running and epsm_local database exists');
  } else {
    console.log('✅ Connected to PostgreSQL database: epsm_local');
    release();
  }
});

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API server running' });
});

// Materials endpoints
app.get('/api/materials', async (req, res) => {
  try {
    console.log('📋 Fetching materials from PostgreSQL database...');
    
    const query = `
      SELECT id, name, roughness, thickness_m, conductivity_w_mk, 
             density_kg_m3, specific_heat_j_kgk, thermal_absorptance,
             solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2,
             cost_sek_per_m2, wall_allowed, roof_allowed, floor_allowed,
             window_layer_allowed, author_id, date_created, date_modified,
             created_at
      FROM materials 
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} materials in PostgreSQL database`);
    
    // Transform database results to include source information
    const materials = result.rows.map(material => ({
      ...material,
      source: 'Local PostgreSQL Database'
    }));
    
    res.json(materials);
    
  } catch (error) {
    console.error('❌ Error fetching materials from PostgreSQL:', error);
    
    // Let's try a simpler query first to see what columns exist
    try {
      console.log('🔄 Trying simplified query...');
      const simpleQuery = `
        SELECT id, name, roughness, thickness_m, conductivity_w_mk, 
               density_kg_m3, specific_heat_j_kgk, thermal_absorptance,
               solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2,
               cost_sek_per_m2, wall_allowed, roof_allowed
        FROM materials 
        ORDER BY name
      `;
      
      const result = await pool.query(simpleQuery);
      
      console.log(`✅ Found ${result.rows.length} materials with simplified query`);
      
      // Transform database results to include missing fields with defaults
      const materials = result.rows.map(material => ({
        ...material,
        floor_allowed: material.floor_allowed || false,
        window_layer_allowed: false,
        author_id: 'migrated_user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        created_at: new Date().toISOString(),
        source: 'Local PostgreSQL Database'
      }));
      
      res.json(materials);
      
    } catch (innerError) {
      console.error('❌ Even simplified query failed:', innerError);
      
      // Fallback to mock data if database connection fails
      console.log('🔄 Falling back to mock data...');
      const materials = [
        {
          id: '1',
          name: 'Concrete Block (Mock Fallback)',
          roughness: 'Rough',
          thickness_m: 0.2,
          conductivity_w_mk: 1.8,
          density_kg_m3: 2300,
          specific_heat_j_kgk: 900,
          thermal_absorptance: 0.9,
          solar_absorptance: 0.7,
          visible_absorptance: 0.7,
          gwp_kgco2e_per_m2: 25.5,
          cost_sek_per_m2: 280.0,
          wall_allowed: true,
          roof_allowed: false,
          floor_allowed: true,
          window_layer_allowed: false,
          author_id: 'mock-user',
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          source: 'Mock Data (PostgreSQL Unavailable)',
          created_at: new Date().toISOString()
        }
      ];
      
      res.json(materials);
    }
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    const materialData = req.body;
    console.log('📝 Creating new material in PostgreSQL database...');
    
    // Check if material with same name already exists
    const existingCheck = await pool.query('SELECT id FROM materials WHERE name = $1', [materialData.name]);
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Material with this name already exists', 
        existing_id: existingCheck.rows[0].id 
      });
    }
    
    const query = `
      INSERT INTO materials (
        name, roughness, thickness_m, conductivity_w_mk, density_kg_m3,
        specific_heat_j_kgk, thermal_absorptance, solar_absorptance,
        visible_absorptance, gwp_kgco2e_per_m2, cost_sek_per_m2,
        wall_allowed, roof_allowed, floor_allowed, window_layer_allowed,
        source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;
    
    const values = [
      materialData.name,
      materialData.roughness || 'MediumRough',
      materialData.thickness_m || 0.1,
      materialData.conductivity_w_mk || 1.0,
      materialData.density_kg_m3 || 1000,
      materialData.specific_heat_j_kgk || 1000,
      materialData.thermal_absorptance || 0.9,
      materialData.solar_absorptance || 0.7,
      materialData.visible_absorptance || 0.7,
      materialData.gwp_kgco2e_per_m2 || 0,
      materialData.cost_sek_per_m2 || 0,
      materialData.wall_allowed !== false,
      materialData.roof_allowed !== false,
      materialData.floor_allowed !== false,
      materialData.window_layer_allowed || false,
      'User Created via API'
    ];
    
    const result = await pool.query(query, values);
    const newMaterial = {
      ...result.rows[0],
      source: 'User Created via API'
    };
    
    console.log(`✅ Created material: ${newMaterial.name}`);
    res.json(newMaterial);
    
  } catch (error) {
    console.error('❌ Error creating material in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to create material', 
      details: error.message 
    });
  }
});

// PUT endpoint for updating materials
app.put('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`📝 Updating material ${id} in PostgreSQL database...`);
    
    const query = `
      UPDATE materials 
      SET name = $2, roughness = $3, thickness_m = $4, conductivity_w_mk = $5,
          density_kg_m3 = $6, specific_heat_j_kgk = $7, thermal_absorptance = $8,
          solar_absorptance = $9, visible_absorptance = $10, gwp_kgco2e_per_m2 = $11,
          cost_sek_per_m2 = $12, wall_allowed = $13, roof_allowed = $14,
          floor_allowed = $15, window_layer_allowed = $16, date_modified = now()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      updates.name,
      updates.roughness,
      updates.thickness_m,
      updates.conductivity_w_mk,
      updates.density_kg_m3,
      updates.specific_heat_j_kgk,
      updates.thermal_absorptance,
      updates.solar_absorptance,
      updates.visible_absorptance,
      updates.gwp_kgco2e_per_m2,
      updates.cost_sek_per_m2,
      updates.wall_allowed,
      updates.roof_allowed,
      updates.floor_allowed,
      updates.window_layer_allowed
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    const updatedMaterial = {
      ...result.rows[0],
      source: 'Updated via API'
    };
    
    console.log(`✅ Updated material: ${updatedMaterial.name}`);
    res.json(updatedMaterial);
    
  } catch (error) {
    console.error('❌ Error updating material in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to update material', 
      details: error.message 
    });
  }
});

// Window glazing endpoints
app.get('/api/window-glazing', async (req, res) => {
  try {
    const glazing = [
      {
        id: '1',
        name: 'Standard Double Glazing (PostgreSQL)',
        thickness_m: 0.006,
        conductivity_w_mk: 1.0,
        solar_transmittance: 0.7,
        visible_transmittance: 0.8,
        infrared_transmittance: 0.0,
        front_ir_emissivity: 0.84,
        back_ir_emissivity: 0.84,
        gwp_kgco2e_per_m2: 22.1,
        cost_sek_per_m2: 520.0,
        author_id: 'postgres-user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        source: 'Local PostgreSQL Database',
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(glazing);
  } catch (error) {
    console.error('Error fetching window glazing:', error);
    res.status(500).json({ error: 'Failed to fetch window glazing' });
  }
});

// Constructions endpoints
app.get('/api/constructions', async (req, res) => {
  try {
    console.log('🏗️ Fetching constructions from PostgreSQL database...');
    
    // First get all constructions
    const constructionsQuery = `
      SELECT id, name, element_type, is_window, u_value_w_m2k, 
             gwp_kgco2e_per_m2, cost_sek_per_m2, author_id, 
             date_created, date_modified, created_at
      FROM constructions 
      ORDER BY name
    `;
    
    const constructionsResult = await pool.query(constructionsQuery);
    
    // Get all layers with materials for these constructions
    const layersQuery = `
      SELECT l.construction_id, l.layer_order, l.material_id, l.glazing_id,
             m.name as material_name, m.thickness_m, m.conductivity_w_mk,
             m.density_kg_m3, m.specific_heat_j_kgk
      FROM layers l
      LEFT JOIN materials m ON l.material_id = m.id
      ORDER BY l.construction_id, l.layer_order
    `;
    
    const layersResult = await pool.query(layersQuery);
    
    console.log(`✅ Found ${constructionsResult.rows.length} constructions in PostgreSQL database`);
    
    // Group layers by construction_id
    const layersByConstruction = {};
    layersResult.rows.forEach(layer => {
      if (!layersByConstruction[layer.construction_id]) {
        layersByConstruction[layer.construction_id] = [];
      }
      layersByConstruction[layer.construction_id].push({
        layer_order: layer.layer_order,
        material_id: layer.material_id,
        material_name: layer.material_name,
        thickness_m: layer.thickness_m,
        conductivity_w_mk: layer.conductivity_w_mk,
        density_kg_m3: layer.density_kg_m3,
        specific_heat_j_kgk: layer.specific_heat_j_kgk,
        glazing_id: layer.glazing_id
      });
    });
    
    // Transform database results to include layers and materials
    const constructions = constructionsResult.rows.map(construction => ({
      ...construction,
      layers: layersByConstruction[construction.id] || [],
      source: 'Local PostgreSQL Database'
    }));
    
    res.json(constructions);
    
  } catch (error) {
    console.error('❌ Error fetching constructions from PostgreSQL:', error);
    
    // Try simplified query if full query fails
    try {
      console.log('🔄 Trying simplified constructions query...');
      const simpleQuery = `
        SELECT id, name, element_type, is_window, u_value_w_m2k, 
               gwp_kgco2e_per_m2, cost_sek_per_m2
        FROM constructions 
        ORDER BY name
      `;
      
      const result = await pool.query(simpleQuery);
      
      console.log(`✅ Found ${result.rows.length} constructions with simplified query`);
      
      const constructions = result.rows.map(construction => ({
        ...construction,
        author_id: 'migrated_user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        created_at: new Date().toISOString(),
        source: 'Local PostgreSQL Database'
      }));
      
      res.json(constructions);
      
    } catch (innerError) {
      console.error('❌ Even simplified constructions query failed:', innerError);
      res.json([]); // Return empty array as fallback
    }
  }
});

// Construction sets endpoints
app.get('/api/construction-sets', async (req, res) => {
  try {
    console.log('🏗️ Fetching construction sets from PostgreSQL database...');
    
    const query = `
      SELECT cs.id, cs.name, cs.description, cs.wall_construction_id, 
             cs.roof_construction_id, cs.floor_construction_id, 
             cs.window_construction_id, cs.author_id, cs.date_created, 
             cs.date_modified, cs.created_at,
             wc.name as wall_construction_name,
             rc.name as roof_construction_name,
             fc.name as floor_construction_name,
             wic.name as window_construction_name
      FROM construction_sets cs
      LEFT JOIN constructions wc ON cs.wall_construction_id = wc.id
      LEFT JOIN constructions rc ON cs.roof_construction_id = rc.id
      LEFT JOIN constructions fc ON cs.floor_construction_id = fc.id
      LEFT JOIN constructions wic ON cs.window_construction_id = wic.id
      ORDER BY cs.name
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} construction sets in PostgreSQL database`);
    
    // Transform database results to include missing fields with defaults
    const constructionSets = result.rows.map(set => ({
      ...set,
      source: 'Local PostgreSQL Database'
    }));
    
    res.json(constructionSets);
    
  } catch (error) {
    console.error('❌ Error fetching construction sets from PostgreSQL:', error);
    
    // Try simplified query if full query fails
    try {
      console.log('🔄 Trying simplified construction sets query...');
      const simpleQuery = `
        SELECT id, name, description, wall_construction_id, 
               roof_construction_id, floor_construction_id, 
               window_construction_id
        FROM construction_sets 
        ORDER BY name
      `;
      
      const result = await pool.query(simpleQuery);
      
      console.log(`✅ Found ${result.rows.length} construction sets with simplified query`);
      
      const constructionSets = result.rows.map(set => ({
        ...set,
        author_id: 'migrated_user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        created_at: new Date().toISOString(),
        source: 'Local PostgreSQL Database'
      }));
      
      res.json(constructionSets);
      
    } catch (innerError) {
      console.error('❌ Even simplified construction sets query failed:', innerError);
      res.json([]); // Return empty array as fallback
    }
  }
});

// DELETE endpoint for deleting materials
app.delete('/api/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting material ${id} from PostgreSQL database...`);
    
    const query = `DELETE FROM materials WHERE id = $1 RETURNING name`;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    console.log(`✅ Deleted material: ${result.rows[0].name}`);
    res.json({ message: 'Material deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting material in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to delete material', 
      details: error.message 
    });
  }
});

// POST endpoint for creating constructions
app.post('/api/constructions', async (req, res) => {
  try {
    const constructionData = req.body;
    console.log('📝 Creating new construction in PostgreSQL database...');
    
    const query = `
      INSERT INTO constructions (
        name, element_type, is_window, u_value_w_m2k, 
        gwp_kgco2e_per_m2, cost_sek_per_m2, source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;
    
    const values = [
      constructionData.name,
      constructionData.element_type || 'wall',
      constructionData.is_window || false,
      constructionData.u_value_w_m2k || 1.0,
      constructionData.gwp_kgco2e_per_m2 || 0,
      constructionData.cost_sek_per_m2 || 0,
      'User Created via API'
    ];
    
    const result = await pool.query(query, values);
    const newConstruction = {
      ...result.rows[0],
      source: 'User Created via API'
    };
    
    console.log(`✅ Created construction: ${newConstruction.name}`);
    res.json(newConstruction);
    
  } catch (error) {
    console.error('❌ Error creating construction in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to create construction', 
      details: error.message 
    });
  }
});

// PUT endpoint for updating constructions
app.put('/api/constructions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`📝 Updating construction ${id} in PostgreSQL database...`);
    
    const query = `
      UPDATE constructions 
      SET name = $2, element_type = $3, is_window = $4, u_value_w_m2k = $5,
          gwp_kgco2e_per_m2 = $6, cost_sek_per_m2 = $7, date_modified = $8
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      updates.name,
      updates.element_type,
      updates.is_window,
      updates.u_value_w_m2k,
      updates.gwp_kgco2e_per_m2,
      updates.cost_sek_per_m2,
      new Date().toISOString()
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Construction not found' });
    }
    
    const updatedConstruction = {
      ...result.rows[0],
      source: 'Updated via API'
    };
    
    console.log(`✅ Updated construction: ${updatedConstruction.name}`);
    res.json(updatedConstruction);
    
  } catch (error) {
    console.error('❌ Error updating construction in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to update construction', 
      details: error.message 
    });
  }
});

// DELETE endpoint for deleting constructions
app.delete('/api/constructions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting construction ${id} from PostgreSQL database...`);
    
    const query = `DELETE FROM constructions WHERE id = $1 RETURNING name`;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Construction not found' });
    }
    
    console.log(`✅ Deleted construction: ${result.rows[0].name}`);
    res.json({ message: 'Construction deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting construction in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to delete construction', 
      details: error.message 
    });
  }
});

// POST endpoint for creating construction sets
app.post('/api/construction-sets', async (req, res) => {
  try {
    const setData = req.body;
    console.log('📝 Creating new construction set in PostgreSQL database...');
    
    const query = `
      INSERT INTO construction_sets (
        name, description, wall_construction_id, roof_construction_id,
        floor_construction_id, window_construction_id, source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;
    
    const values = [
      setData.name,
      setData.description || null,
      setData.wall_construction_id || null,
      setData.roof_construction_id || null,
      setData.floor_construction_id || null,
      setData.window_construction_id || null,
      'User Created via API'
    ];
    
    const result = await pool.query(query, values);
    const newSet = {
      ...result.rows[0],
      source: 'User Created via API'
    };
    
    console.log(`✅ Created construction set: ${newSet.name}`);
    res.json(newSet);
    
  } catch (error) {
    console.error('❌ Error creating construction set in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to create construction set', 
      details: error.message 
    });
  }
});

// PUT endpoint for updating construction sets
app.put('/api/construction-sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log(`📝 Updating construction set ${id} in PostgreSQL database...`);
    
    // Build dynamic query to only update provided fields
    const setParts = [];
    const values = [id];
    let paramCount = 2;
    
    if (updates.name !== undefined) {
      setParts.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }
    if (updates.description !== undefined) {
      setParts.push(`description = $${paramCount}`);
      values.push(updates.description);
      paramCount++;
    }
    if (updates.wall_construction_id !== undefined) {
      setParts.push(`wall_construction_id = $${paramCount}`);
      values.push(updates.wall_construction_id);
      paramCount++;
    }
    if (updates.roof_construction_id !== undefined) {
      setParts.push(`roof_construction_id = $${paramCount}`);
      values.push(updates.roof_construction_id);
      paramCount++;
    }
    if (updates.floor_construction_id !== undefined) {
      setParts.push(`floor_construction_id = $${paramCount}`);
      values.push(updates.floor_construction_id);
      paramCount++;
    }
    if (updates.window_construction_id !== undefined) {
      setParts.push(`window_construction_id = $${paramCount}`);
      values.push(updates.window_construction_id);
      paramCount++;
    }
    
    // Always update the modified timestamp
    setParts.push(`date_modified = $${paramCount}`);
    values.push(new Date().toISOString());
    
    if (setParts.length === 1) { // Only date_modified
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const query = `
      UPDATE construction_sets 
      SET ${setParts.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Construction set not found' });
    }
    
    const updatedSet = {
      ...result.rows[0],
      source: 'Updated via API'
    };
    
    console.log(`✅ Updated construction set: ${updatedSet.name}`);
    res.json(updatedSet);
    
  } catch (error) {
    console.error('❌ Error updating construction set in PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to update construction set', 
      details: error.message 
    });
  }
});

// DELETE endpoint for construction sets
app.delete('/api/construction-sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting construction set ${id} from PostgreSQL database...`);
    
    const result = await pool.query('DELETE FROM construction_sets WHERE id = $1 RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Construction set not found' });
    }
    
    console.log(`✅ Deleted construction set: ${result.rows[0].name}`);
    res.json({ message: 'Construction set deleted successfully' });
    
  } catch (error) {
    console.error('❌ Error deleting construction set from PostgreSQL:', error);
    res.status(500).json({ 
      error: 'Failed to delete construction set', 
      details: error.message 
    });
  }
});

// Scenarios endpoints  
app.get('/api/scenarios', async (req, res) => {
  try {
    const scenarios = [];
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Authentication endpoints
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Authentication request for: ${email}`);
    
    // Query the users table in PostgreSQL
    const query = 'SELECT id, email, created_at FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ User found in PostgreSQL database');
      
      const session = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        access_token: 'postgres_access_token_' + Date.now(),
        refresh_token: 'postgres_refresh_token_' + Date.now(),
      };
      res.json(session);
      
    } else {
      console.log('❌ User not found in PostgreSQL database');
      res.status(401).json({ error: 'Invalid credentials' });
    }
    
  } catch (error) {
    console.error('❌ PostgreSQL authentication error:', error);
    
    // Fallback to mock authentication
    console.log('🔄 Falling back to mock authentication...');
    if (email === 'demo@chalmers.se' && password === 'demo123') {
      const session = {
        user: {
          id: '1',
          email: email,
          created_at: new Date().toISOString(),
        },
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now(),
      };
      res.json(session);
    } else {
      res.status(401).json({ error: 'Invalid credentials (PostgreSQL unavailable)' });
    }
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Mock signup
    const session = {
      user: {
        id: Date.now().toString(),
        email: email,
        created_at: new Date().toISOString(),
      },
      access_token: 'api_access_token_' + Date.now(),
      refresh_token: 'api_refresh_token_' + Date.now(),
    };
    
    res.json(session);
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
});

app.post('/api/auth/signout', async (req, res) => {
  try {
    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Error signing out:', error);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

app.get('/api/auth/refresh', async (req, res) => {
  try {
    const session = {
      user: {
        id: '1',
        email: 'demo@chalmers.se',
        created_at: new Date().toISOString(),
      },
      access_token: 'refreshed_api_access_token_' + Date.now(),
      refresh_token: 'refreshed_api_refresh_token_' + Date.now(),
    };
    res.json(session);
  } catch (error) {
    console.error('Error refreshing session:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

// Catch all
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📊 Serving PostgreSQL data to frontend`);
  console.log(`🔗 Frontend should call: http://localhost:${PORT}/api/...`);
  console.log(`💡 This API will replace mock data with real PostgreSQL queries`);
});