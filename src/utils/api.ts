// This file should be used for non-database API calls only
const API_BASE_URL = 'http://localhost:8000/api';

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