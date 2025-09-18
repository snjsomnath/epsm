/**
 * Simple PostgreSQL test using direct connection
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a pool for testing
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'epsm_local',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function testConnection() {
  console.log('🧪 Testing PostgreSQL Connection');
  console.log('================================');
  
  try {
    // Test basic connection
    console.log('1️⃣ Testing basic connection...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Test version
    console.log('\n2️⃣ Getting PostgreSQL version...');
    const versionResult = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', versionResult.rows[0].version);
    
    // Test table listing
    console.log('\n3️⃣ Listing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Test sample data
    console.log('\n4️⃣ Testing sample data from materials table...');
    const materialsResult = await client.query(`
      SELECT id, name, thickness_m, conductivity_w_mk 
      FROM materials 
      ORDER BY name 
      LIMIT 5
    `);
    console.log(`✅ Found ${materialsResult.rows.length} materials:`);
    materialsResult.rows.forEach(row => {
      console.log(`  - ${row.name} (k=${row.conductivity_w_mk} W/mK)`);
    });
    
    // Test count of all data
    console.log('\n5️⃣ Getting record counts...');
    const countResult = await client.query(`
      SELECT 
        (SELECT count(*) FROM materials) as materials,
        (SELECT count(*) FROM constructions) as constructions,
        (SELECT count(*) FROM layers) as layers,
        (SELECT count(*) FROM user_profiles) as user_profiles
    `);
    const counts = countResult.rows[0];
    console.log('✅ Record counts:');
    console.log(`  Materials: ${counts.materials}`);
    console.log(`  Constructions: ${counts.constructions}`);
    console.log(`  Layers: ${counts.layers}`);
    console.log(`  User Profiles: ${counts.user_profiles}`);
    
    client.release();
    console.log('\n🎉 PostgreSQL connection test successful!');
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the test
testConnection();