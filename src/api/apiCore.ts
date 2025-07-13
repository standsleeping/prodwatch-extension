import { ServerFunctionResponse } from './apiService';

// Type definitions for API operations
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user_id: string;
  email: string;
}

export interface SearchRequest {
  event_name: string;
  function_names: string[];
  app_name: string;
}

export interface ApiConfig {
  baseUrl: string;
}

// Validation functions
export const isValidUsername = (username: string | undefined): boolean => {
  return typeof username === 'string' && username.trim().length > 0;
};

export const isValidPassword = (password: string | undefined): boolean => {
  return typeof password === 'string' && password.length > 0;
};

export const isValidToken = (token: string | undefined): boolean => {
  return typeof token === 'string' && token.length > 0;
};

export const isValidAppName = (appName: string | undefined): boolean => {
  return typeof appName === 'string' && appName.trim().length > 0;
};

export const isValidBaseUrl = (baseUrl: string | undefined): boolean => {
  if (typeof baseUrl !== 'string') { return false; }
  try {
    new URL(baseUrl);
    return true;
  } catch {
    return false;
  }
};

export const isValidFunctionNames = (functionNames: unknown): functionNames is string[] => {
  return Array.isArray(functionNames) &&
    functionNames.length > 0 &&
    functionNames.every(name => typeof name === 'string' && name.length > 0);
};

// Credential validation
export const validateLoginCredentials = (credentials: Partial<LoginCredentials>): string[] => {
  const errors: string[] = [];

  if (!isValidUsername(credentials.username)) {
    errors.push('Username is required and cannot be empty');
  }

  if (!isValidPassword(credentials.password)) {
    errors.push('Password is required and cannot be empty');
  }

  return errors;
};

// Request body creation
export const createLoginRequest = (credentials: LoginCredentials): object => {
  return {
    username: credentials.username.trim(),
    password: credentials.password
  };
};

export const createSearchRequest = (functionNames: string[], appName: string): SearchRequest => {
  return {
    event_name: "search-function-calls",
    function_names: functionNames.filter(name => name.trim().length > 0),
    app_name: appName
  };
};

// Response validation
export const isValidLoginResponse = (response: unknown): response is LoginResponse => {
  return typeof response === 'object' &&
    response !== null &&
    'token' in response &&
    'user_id' in response &&
    'email' in response &&
    typeof (response as any).token === 'string' &&
    (response as any).token.length > 0;
};

export const isValidServerFunctionResponse = (response: unknown): response is ServerFunctionResponse => {
  if (typeof response !== 'object' || response === null) { return false; }

  const resp = response as any;
  return 'function_names' in resp &&
    'total_calls' in resp &&
    'functions' in resp &&
    Array.isArray(resp.function_names) &&
    typeof resp.total_calls === 'number' &&
    typeof resp.functions === 'object';
};

// Configuration functions
export const normalizeApiConfig = (config: Partial<ApiConfig>): ApiConfig => {
  return {
    baseUrl: config.baseUrl?.trim() || 'https://getprodwatch.com'
  };
};

// Error handling utilities
export const createApiError = (message: string, status?: number): Error => {
  const error = new Error(message);
  if (status) {
    (error as any).status = status;
  }
  return error;
};

export const isApiError = (error: unknown): error is Error & { status?: number } => {
  return error instanceof Error;
};

export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return error.message;
  }
  return String(error);
};

// HTTP status utilities
export const isUnauthorizedStatus = (status: number): boolean => {
  return status === 401;
};

export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

export const isServerError = (status: number): boolean => {
  return status >= 500 && status < 600;
};