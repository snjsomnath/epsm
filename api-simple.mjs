#!/usr/bin/env node

import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const PORT = 8000;

// PostgreSQL connection
const pool = new Pool({
  user: 'ssanjay',
  host: 'localhost',
  database: 'epsm_local',
  port: 5432,
});

app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Materials endpoint with real PostgreSQL data
app.get('/api/materials', async (req, res) => {
  try {
    console.log('📋 API request for materials');
    
    const query = `
      SELECT id, name, roughness, thickness_m, conductivity_w_mk, 
             density_kg_m3, specific_heat_j_kgk, thermal_absorptance,
             solar_absorptance, visible_absorptance, gwp_kgco2e_per_m2,
             cost_sek_per_m2, wall_allowed, roof_allowed
      FROM materials 
      ORDER BY name
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ Returning ${result.rows.length} materials`);
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Minimal API Server running on http://localhost:${PORT}`);
  console.log(`📊 Test with: curl http://localhost:${PORT}/health`);
  console.log(`📊 Test materials: curl http://localhost:${PORT}/api/materials`);
});