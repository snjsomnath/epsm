import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

console.log('Initializing Supabase client...');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test the connection and verify data access
console.log('Testing Supabase connection...');

Promise.all([
  supabase.from('materials').select('count').single(),
  supabase.from('window_glazing').select('count').single(),
  supabase.from('constructions').select('count').single(),
  supabase.from('construction_sets').select('count').single()
])
.then(([materials, glazing, constructions, sets]) => {
  console.log('Connection test results:');
  console.log('Materials:', materials.data?.count ?? 'Error:', materials.error?.message);
  console.log('Window Glazing:', glazing.data?.count ?? 'Error:', glazing.error?.message);
  console.log('Constructions:', constructions.data?.count ?? 'Error:', constructions.error?.message);
  console.log('Construction Sets:', sets.data?.count ?? 'Error:', sets.error?.message);
  
  if (materials.error || glazing.error || constructions.error || sets.error) {
    console.error('Some tables had errors:');
    if (materials.error) console.error('Materials error:', materials.error);
    if (glazing.error) console.error('Glazing error:', glazing.error);
    if (constructions.error) console.error('Constructions error:', constructions.error);
    if (sets.error) console.error('Sets error:', sets.error);
  } else {
    console.log('✅ All tables accessible');
  }
})
.catch(err => {
  console.error('❌ Supabase connection failed:', err);
  console.error('Error details:', err);
});