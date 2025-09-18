#!/usr/bin/env node

// Simple test to verify PostgreSQL connection works
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: 'ssanjay',
  host: 'localhost',
  database: 'epsm_local',
  port: 5432,
});

async function testConnection() {
  try {
    console.log('🔌 Testing PostgreSQL connection...');
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    const result = await client.query('SELECT id, name FROM materials LIMIT 3');
    console.log(`📋 Found ${result.rows.length} materials:`);
    
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.id})`);
    });
    
    client.release();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testConnection();