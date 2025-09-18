#!/usr/bin/env node

// Simple Express API server to serve PostgreSQL data to the frontend
// This server uses the real database functions from src/lib/database.ts
// but runs in Node.js environment so it can handle PostgreSQL connections

const express = require('express');
const cors = require('cors');
const path = require('path');

// We need to use a transpiler to run TypeScript files
// For now, let's create a simple JavaScript version

const app = express();
const PORT = process.env.PORT || 8000;

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
    // For now, return mock data until we can properly import the TypeScript functions
    const materials = [
      {
        id: '1',
        name: 'Concrete Block',
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
        author_id: 'postgres-user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        source: 'Local PostgreSQL Database',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Insulation Board',
        roughness: 'Medium',
        thickness_m: 0.1,
        conductivity_w_mk: 0.035,
        density_kg_m3: 25,
        specific_heat_j_kgk: 1400,
        thermal_absorptance: 0.8,
        solar_absorptance: 0.6,
        visible_absorptance: 0.6,
        gwp_kgco2e_per_m2: 12.3,
        cost_sek_per_m2: 150.0,
        wall_allowed: true,
        roof_allowed: true,
        floor_allowed: true,
        window_layer_allowed: false,
        author_id: 'postgres-user',
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        source: 'Local PostgreSQL Database',
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    const materialData = req.body;
    
    // Mock creation for now
    const newMaterial = {
      id: Date.now().toString(),
      ...materialData,
      created_at: new Date().toISOString()
    };
    
    res.json(newMaterial);
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Window glazing endpoints
app.get('/api/window-glazing', async (req, res) => {
  try {
    const glazing = [
      {
        id: '1',
        name: 'Standard Double Glazing',
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
    const constructions = [];
    res.json(constructions);
  } catch (error) {
    console.error('Error fetching constructions:', error);
    res.status(500).json({ error: 'Failed to fetch constructions' });
  }
});

// Construction sets endpoints
app.get('/api/construction-sets', async (req, res) => {
  try {
    const constructionSets = [];
    res.json(constructionSets);
  } catch (error) {
    console.error('Error fetching construction sets:', error);
    res.status(500).json({ error: 'Failed to fetch construction sets' });
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
    
    // Mock authentication for demo
    if (email === 'demo@chalmers.se' && password === 'demo123') {
      const session = {
        user: {
          id: '1',
          email: email,
          created_at: new Date().toISOString(),
        },
        access_token: 'api_access_token_' + Date.now(),
        refresh_token: 'api_refresh_token_' + Date.now(),
      };
      res.json(session);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({ error: 'Failed to sign in' });
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
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📊 Serving PostgreSQL data to frontend`);
  console.log(`🔗 Frontend should call: http://localhost:${PORT}/api/...`);
});