#!/usr/bin/env node

import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();

// PostgreSQL connection
const pool = new Pool({
  user: 'ssanjay',
  host: 'localhost',
  database: 'epsm_local',
  port: 5432,
});

app.use(express.json());

app.get('/test', async (req, res) => {
  try {
    console.log('Testing PostgreSQL connection...');
    
    const result = await pool.query('SELECT id, name FROM materials LIMIT 2');
    
    console.log(`Found ${result.rows.length} materials`);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Test API running on port 3001');
});