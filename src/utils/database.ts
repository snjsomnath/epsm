// Mock database interface for frontend
interface UserPreference {
  userId: number;
  key: string;
  value: any;
}

// In-memory storage for development/demo purposes
const preferenceStore = new Map<string, any>();

export const getUserPreference = async (userId: number, key: string): Promise<any> => {
  const storageKey = `${userId}:${key}`;
  return preferenceStore.get(storageKey) || null;
};

export const setUserPreference = async (userId: number, key: string, value: any): Promise<void> => {
  const storageKey = `${userId}:${key}`;
  preferenceStore.set(storageKey, value);
};

// Initialize any required frontend storage
const initDatabase = () => {
  console.log('Frontend storage initialized');
  return true;
};

// Clean up any resources if needed
export const closeDatabase = () => {
  preferenceStore.clear();
};

// Initialize when module is loaded
initDatabase();