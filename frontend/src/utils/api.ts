// API configuration
const API_BASE_URL = '/api';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Helper function to get the full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

// Retry logic for failed requests
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = MAX_RETRIES, delayMs = 1000 } = options;
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}

// Enhanced response handling with validation
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    if (response.status === 413) {
      throw new Error('File size exceeds server limit');
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }
    const error = await response.json();
    throw new Error(error.message || 'An error occurred');
  }
  
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid response format');
  }
  
  const data = await response.json();
  return { data };
}

// File validation with detailed checks
interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions: string[];
  maxFiles?: number;
  validateContent?: (file: File) => Promise<boolean>;
}

async function validateFiles(files: File[], options: FileValidationOptions): Promise<void> {
  const { 
    maxSize = 5 * 1024 * 1024, 
    allowedExtensions, 
    maxFiles = 10,
    validateContent 
  } = options;

  if (files.length > maxFiles) {
    throw new Error(`Maximum ${maxFiles} files allowed`);
  }

  const validations = files.map(async file => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (!ext || !allowedExtensions.includes(`.${ext}`)) {
      throw new Error(`Invalid file type: ${file.name}. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File too large: ${file.name}. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    if (validateContent) {
      const isValid = await validateContent(file);
      if (!isValid) {
        throw new Error(`Invalid file content: ${file.name}`);
      }
    }
  });

  await Promise.all(validations);
}

// Enhanced IDF parsing with content validation
export const parseIdfFiles = async (files: File[]) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    await validateFiles(files, {
      allowedExtensions: ['.idf'],
      maxSize: 5 * 1024 * 1024,
      maxFiles: 10,
      validateContent: async (file) => {
        // Basic IDF content validation
        const content = await file.text();
        return content.includes('Version,') && content.includes('Building,');
      }
    });

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    return await withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/parse/idf/`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        // Do not include credentials for this public parse endpoint.
        // Including cookies triggers DRF SessionAuthentication which
        // enforces CSRF and can return 403 when no CSRF token is sent.
      });

      return handleResponse(response);
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return { error: 'Request timed out' };
      }
      return { error: err.message };
    }
    return { error: 'An unexpected error occurred' };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Weather file validation
export const validateWeatherFile = async (file: File): Promise<boolean> => {
  try {
    const content = await file.text();
    const lines = content.split('\n');
    
    // Basic EPW format validation
    return lines.some(line => line.includes('LOCATION,')) &&
           lines.some(line => line.includes('DESIGN CONDITIONS,')) &&
           lines.length > 8760; // At least one year of hourly data
  } catch {
    return false;
  }
};

// Simulation operations with enhanced error handling
export const runBaselineSimulation = async (files: FormData) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    return await withRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/simulate/baseline/`, {
        method: 'POST',
        body: files,
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });

      return handleResponse(response);
    });
  } catch (err) {
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const getSimulationStatus = async (simulationId: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(simulationId)) {
    throw new Error('Invalid simulation ID format');
  }

  return await withRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/simulate/status/${simulationId}/`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    return handleResponse(response);
  });
};

export const getSimulationResults = async (simulationId: string) => {
  if (!/^[a-zA-Z0-9-]+$/.test(simulationId)) {
    throw new Error('Invalid simulation ID format');
  }

  return await withRetry(async () => {
    const response = await fetch(`${API_BASE_URL}/simulate/results/${simulationId}/`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });

    return handleResponse(response);
  });
};