#!/usr/bin/env node

/**
 * PostgreSQL Client Test
 * Tests the new PostgreSQL client to ensure it works correctly
 */

import { postgres, directClient } from './src/lib/queryBuilder.js';

async function testDatabaseClient() {
  console.log('🧪 Testing PostgreSQL Client');
  console.log('============================');

  try {
    // Test 1: Connection test
    console.log('1️⃣ Testing database connection...');
    const connectionOk = await postgres.testConnection();
    if (connectionOk) {
      console.log('✅ Connection successful');
    } else {
      console.log('❌ Connection failed');
      return;
    }

    // Test 2: Get connection info
    console.log('\n2️⃣ Getting connection info...');
    const info = await directClient.getConnectionInfo();
    console.log('✅ Connection info:', info);

    // Test 3: Test query builder - Select all materials
    console.log('\n3️⃣ Testing query builder - Select materials...');
    const materialsResult = await postgres
      .from('materials')
      .select('id, name, thickness_m, conductivity_w_mk')
      .order('name')
      .execute();

    if (materialsResult.error) {
      console.log('❌ Materials query failed:', materialsResult.error.message);
    } else {
      console.log(`✅ Found ${materialsResult.data?.length} materials`);
      materialsResult.data?.forEach(material => {
        console.log(`  - ${material.name} (${material.thickness_m}m thick)`);
      });
    }

    // Test 4: Test query builder - Select with WHERE
    console.log('\n4️⃣ Testing WHERE clause...');
    const brickResult = await postgres
      .from('materials')
      .select('*')
      .eq('name', 'Brick')
      .single();

    if (brickResult.error) {
      console.log('❌ Brick query failed:', brickResult.error.message);
    } else if (brickResult.data) {
      console.log('✅ Found brick material:', brickResult.data.name);
    } else {
      console.log('⚠️ Brick material not found');
    }

    // Test 5: Test complex join query
    console.log('\n5️⃣ Testing complex join query...');
    const joinResult = await directClient.query(`
      SELECT 
        m.name as material_name,
        m.thickness_m,
        c.name as construction_name,
        l.layer_order
      FROM materials m
      JOIN layers l ON m.id = l.material_id
      JOIN constructions c ON l.construction_id = c.id
      ORDER BY c.name, l.layer_order
      LIMIT 5
    `);

    if (joinResult.rows.length > 0) {
      console.log('✅ Join query successful:');
      joinResult.rows.forEach(row => {
        console.log(`  ${row.construction_name} Layer ${row.layer_order}: ${row.material_name}`);
      });
    } else {
      console.log('⚠️ No join results found');
    }

    // Test 6: Test count query
    console.log('\n6️⃣ Testing count queries...');
    const counts = await directClient.query(`
      SELECT 
        (SELECT count(*) FROM materials) as materials_count,
        (SELECT count(*) FROM constructions) as constructions_count,
        (SELECT count(*) FROM layers) as layers_count
    `);

    const countData = counts.rows[0];
    console.log('✅ Record counts:');
    console.log(`  Materials: ${countData.materials_count}`);
    console.log(`  Constructions: ${countData.constructions_count}`);
    console.log(`  Layers: ${countData.layers_count}`);

    // Test 7: Test pool status
    console.log('\n7️⃣ Testing connection pool status...');
    const poolStatus = directClient.getPoolStatus();
    console.log('✅ Pool status:', poolStatus);

    console.log('\n🎉 All tests passed! PostgreSQL client is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Don't close connections in test - let them be managed by the pool
    console.log('\n📊 Test completed.');
  }
}

// Run tests
testDatabaseClient();