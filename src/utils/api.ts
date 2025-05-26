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

// IDF parsing operations with timeout
export const parseIdfFiles = async (files: File[]) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/parse/idf/`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
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

// Simulation operations
export const runBaselineSimulation = async (files: FormData) => {
  const response = await fetch(`${API_BASE_URL}/simulate/baseline/`, {
    method: 'POST',
    body: files,
  });
  return handleResponse(response);
};

export const getSimulationStatus = async (simulationId: string) => {
  const response = await fetch(`${API_BASE_URL}/simulate/status/${simulationId}/`);
  return handleResponse(response);
};

export const getSimulationResults = async (simulationId: string) => {
  const response = await fetch(`${API_BASE_URL}/simulate/results/${simulationId}/`);
  return handleResponse(response);
};