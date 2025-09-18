#!/usr/bin/env node

/**
 * Supabase Data Export using Application Client
 * This script uses your existing Supabase configuration to export data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read configuration from your .env file
const envContent = fs.readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

console.log('🚀 Starting Supabase Data Export via API');
console.log('=====================================');
console.log(`📊 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// Create export directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const exportDir = 'database_exports';
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

// Tables to export
const tables = [
  'materials',
  'window_glazing',
  'constructions', 
  'layers',
  'construction_sets',
  'scenarios',
  'scenario_constructions'
];

async function exportData() {
  const exportData = {
    timestamp,
    source: supabaseUrl,
    tables: {}
  };

  console.log('\n📤 Exporting table data...');

  for (const tableName of tables) {
    try {
      console.log(`  🔄 Exporting ${tableName}...`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error(`  ❌ Error exporting ${tableName}:`, error.message);
        continue;
      }

      exportData.tables[tableName] = data;
      console.log(`  ✅ ${tableName}: ${data.length} records`);
      
    } catch (err) {
      console.error(`  ❌ Exception exporting ${tableName}:`, err.message);
    }
  }

  // Save as JSON
  const jsonFile = path.join(exportDir, `supabase_data_${timestamp}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Data exported to: ${jsonFile}`);

  // Save as SQL INSERT statements
  const sqlFile = path.join(exportDir, `supabase_data_${timestamp}.sql`);
  let sqlContent = `-- Supabase Data Export\n-- Generated: ${new Date().toISOString()}\n-- Source: ${supabaseUrl}\n\n`;

  for (const [tableName, records] of Object.entries(exportData.tables)) {
    if (records.length === 0) continue;

    sqlContent += `-- Table: ${tableName}\n`;
    
    for (const record of records) {
      const columns = Object.keys(record);
      const values = columns.map(col => {
        const val = record[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return val;
      });

      sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    sqlContent += '\n';
  }

  fs.writeFileSync(sqlFile, sqlContent);
  console.log(`✅ SQL export saved to: ${sqlFile}`);

  // Create summary
  const summaryFile = path.join(exportDir, `export_summary_${timestamp}.md`);
  let summary = `# Supabase Data Export Summary\n\n`;
  summary += `**Export Date:** ${new Date().toISOString()}\n`;
  summary += `**Source:** ${supabaseUrl}\n`;
  summary += `**Method:** Supabase Client API\n\n`;
  summary += `## Exported Data\n\n`;

  for (const [tableName, records] of Object.entries(exportData.tables)) {
    summary += `- **${tableName}**: ${records.length} records\n`;
  }

  summary += `\n## Files Created\n\n`;
  summary += `1. \`${path.basename(jsonFile)}\` - JSON format data\n`;
  summary += `2. \`${path.basename(sqlFile)}\` - SQL INSERT statements\n`;
  summary += `3. \`${path.basename(summaryFile)}\` - This summary\n\n`;
  summary += `## Notes\n\n`;
  summary += `- This export only includes application data (public schema)\n`;
  summary += `- Schema structure is not included - you'll need to recreate tables\n`;
  summary += `- Authentication data is not included\n`;
  summary += `- Use the SQL file to import data after creating the schema\n`;

  fs.writeFileSync(summaryFile, summary);
  console.log(`✅ Summary saved to: ${summaryFile}`);

  console.log('\n🎉 Export completed successfully!');
  console.log(`📁 Check the '${exportDir}' directory for exported files`);
}

// Run export
exportData().catch(err => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});