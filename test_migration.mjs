#!/usr/bin/env node

// Test script to verify the migration from Supabase to PostgreSQL
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🧪 Testing Migration from Supabase to PostgreSQL...\n');

// Test 1: Verify PostgreSQL is running and accessible
console.log('📊 Test 1: PostgreSQL Connection...');
try {
  const { stdout } = await execAsync('psql -d epsm_local -c "SELECT current_database(), version();" 2>/dev/null || echo "Connection failed"');
  if (stdout.includes('epsm_local')) {
    console.log('✅ PostgreSQL connection successful');
    console.log(`   Database: ${stdout.split('\n')[2]?.trim()}`);
  } else {
    console.log('❌ PostgreSQL connection failed');
  }
} catch (error) {
  console.log('❌ PostgreSQL connection failed:', error.message);
}

// Test 2: Check if tables exist
console.log('\n📋 Test 2: Database Tables...');
try {
  const { stdout } = await execAsync(`psql -d epsm_local -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null || echo "Query failed"`);
  const tables = stdout.split('\n').filter(line => line.trim() && !line.includes('table_name') && !line.includes('---') && !line.includes('(') && line.trim() !== '');
  
  if (tables.length > 0) {
    console.log('✅ Database tables found:');
    tables.forEach(table => console.log(`   - ${table.trim()}`));
  } else {
    console.log('❌ No tables found');
  }
} catch (error) {
  console.log('❌ Table query failed:', error.message);
}

// Test 3: Check materials table data
console.log('\n🧱 Test 3: Materials Data...');
try {
  const { stdout } = await execAsync(`psql -d epsm_local -c "SELECT COUNT(*) as material_count FROM materials;" 2>/dev/null || echo "Query failed"`);
  const count = stdout.split('\n')[2]?.trim();
  if (count && !isNaN(count)) {
    console.log(`✅ Materials table has ${count} records`);
  } else {
    console.log('❌ Could not query materials table');
  }
} catch (error) {
  console.log('❌ Materials query failed:', error.message);
}

// Test 4: Check users table (for authentication)
console.log('\n👤 Test 4: Users Table...');
try {
  const { stdout } = await execAsync(`psql -d epsm_local -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null || echo "Query failed"`);
  const count = stdout.split('\n')[2]?.trim();
  if (count && !isNaN(count)) {
    console.log(`✅ Users table has ${count} records`);
  } else {
    console.log('❌ Could not query users table');
  }
} catch (error) {
  console.log('❌ Users query failed:', error.message);
}

// Test 5: Verify build is working
console.log('\n🔨 Test 5: Application Build...');
try {
  const { stdout, stderr } = await execAsync('npm run build', { cwd: '/Users/ssanjay/GitHub/epsm' });
  if (stdout.includes('built in') && !stderr.includes('Error')) {
    console.log('✅ Application builds successfully');
  } else {
    console.log('❌ Build issues detected');
  }
} catch (error) {
  console.log('❌ Build failed:', error.message);
}

console.log('\n🎯 Migration Test Complete!\n');