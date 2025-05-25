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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: window.localStorage
  }
});

// Test the connection and verify data access
const testConnection = async () => {
  try {
    // First check auth state
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Auth state:', session ? 'Authenticated' : 'Not authenticated');

    // Test database access
    const results = await Promise.all([
      supabase.from('materials').select('count').single(),
      supabase.from('window_glazing').select('count').single(),
      supabase.from('constructions').select('count').single(),
      supabase.from('construction_sets').select('count').single()
    ]);

    const [materials, glazing, constructions, sets] = results;
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      console.error('❌ Some tables are inaccessible:');
      errors.forEach(result => {
        console.error('Error:', result.error?.message);
      });
      return false;
    }

    console.log('✅ Connected to Supabase');
    console.log('Database status:', {
      materials: materials.data?.count ?? 0,
      glazing: glazing.data?.count ?? 0,
      constructions: constructions.data?.count ?? 0,
      sets: sets.data?.count ?? 0
    });
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err);
    return false;
  }
};

// Run connection test
testConnection().catch(err => {
  console.error('❌ Unexpected error during connection test:', err);
});

export const getAuthHeaders = () => {
  const session = supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
};