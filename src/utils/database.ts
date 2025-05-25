// This file is deprecated and should not be used.
// All database operations should use the Supabase client in src/lib/database.ts
console.warn('Warning: utils/database.ts is deprecated. Use lib/database.ts instead.');

export const getUserPreference = async () => {
  throw new Error('Deprecated: Use Supabase client instead');
};

export const setUserPreference = async () => {
  throw new Error('Deprecated: Use Supabase client instead');
};

export const closeDatabase = () => {
  throw new Error('Deprecated: Use Supabase client instead');
};