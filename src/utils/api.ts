// API configuration
const API_BASE_URL = 'http://localhost:8000/api';
const API_TIMEOUT = 10000; // 10 seconds

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const error = await response.json();
    return { error: error.message || 'An error occurred' };
  }
  const data = await response.json();
  return { data };
}

// Validate file before upload
const validateFile = (file: File, allowedExtensions: string[]): boolean => {
  // Check file extension
  const ext = file.name.toLowerCase().split('.').pop();
  if (!ext || !allowedExtensions.includes(`.${ext}`)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  return true;
};

// IDF parsing operations with timeout and validation
export const parseIdfFiles = async (files: File[]) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Validate files
    const allowedExtensions = ['.idf'];
    files.forEach(file => validateFile(file, allowedExtensions));

    // Check total number of files
    if (files.length > 10) {
      throw new Error('Maximum 10 files allowed');
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

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
        throw new Error('API request timed out. Please try again.');
      }
      if (err.message.includes('Failed to fetch')) {
        throw new Error('API endpoint is not reachable. Please check your connection.');
      }
    }
    throw err;
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