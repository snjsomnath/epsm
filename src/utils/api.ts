// API configuration
const API_BASE_URL = 'http://localhost:8000/api';
const API_TIMEOUT = 10000; // 10 seconds

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions: string[];
  maxFiles?: number;
}

// Shared file validation
const validateFiles = (files: File[], options: FileValidationOptions): void => {
  const { maxSize = 5 * 1024 * 1024, allowedExtensions, maxFiles = 10 } = options;

  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} files allowed`);
  }

  files.forEach(file => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!ext || !allowedExtensions.includes(`.${ext}`)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }
  });
};

// Type-safe response handling
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const error = await response.json();
    return { error: error.message || 'An error occurred' };
  }
  const data = await response.json();
  return { data };
}

// IDF parsing with improved error handling
export const parseIdfFiles = async (files: File[]) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    validateFiles(files, {
      allowedExtensions: ['.idf'],
      maxSize: 5 * 1024 * 1024,
      maxFiles: 10
    });

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_BASE_URL}/parse/idf/`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return { error: 'Request timed out' };
      }
      return { error: err.message };
    }
    return { error: 'An unexpected error occurred' };
  }
};

// Simulation operations with security enhancements
export const runBaselineSimulation = async (files: FormData) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/simulate/baseline/`, {
      method: 'POST',
      body: files,
      signal: controller.signal,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export const getSimulationStatus = async (simulationId: string) => {
  // Validate simulation ID format
  if (!/^[a-zA-Z0-9-]+$/.test(simulationId)) {
    throw new Error('Invalid simulation ID format');
  }

  const response = await fetch(`${API_BASE_URL}/simulate/status/${simulationId}/`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  });
  return handleResponse(response);
};

export const getSimulationResults = async (simulationId: string) => {
  // Validate simulation ID format
  if (!/^[a-zA-Z0-9-]+$/.test(simulationId)) {
    throw new Error('Invalid simulation ID format');
  }

  const response = await fetch(`${API_BASE_URL}/simulate/results/${simulationId}/`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  });
  return handleResponse(response);
};