import {
  LoginCredentials,
  LoginResponse,
  ApiConfig,
  WatchRequest,
  WatchResponse,
  validateLoginCredentials,
  createLoginRequest,
  createSearchRequest,
  createWatchRequest,
  isValidLoginResponse,
  isValidServerFunctionResponse,
  isValidWatchResponse,
  normalizeApiConfig,
  isValidFunctionNames,
  isValidAppName,
  createApiError,
  getErrorMessage,
  isUnauthorizedStatus
} from './apiCore';
import { ServerFunctionResponse } from './apiService';

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error; validationErrors?: string[] };

// HTTP abstraction interface
export interface HttpClient {
  fetch(url: string, options: RequestInit): Promise<Response>;
}

// Authentication abstraction interface
export interface AuthStorage {
  storeCredentials(username: string, token: string): Promise<void>;
  getToken(): Promise<string | undefined>;
  isAuthenticated(): Promise<boolean>;
}

// Notification abstraction interface
export interface NotificationService {
  showInfo(message: string): void;
  showError(message: string): void;
  showWarning(message: string): void;
}

// Safe HTTP operations
const safeFetch = async (
  httpClient: HttpClient,
  url: string,
  options: RequestInit
): Promise<Result<Response>> => {
  try {
    const response = await httpClient.fetch(url, options);
    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(getErrorMessage(error))
    };
  }
};

const safeJsonParse = async <T>(response: Response): Promise<Result<T>> => {
  try {
    const data = await response.json() as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: createApiError('Invalid JSON response')
    };
  }
};

// Login operation
export const loginOperation = async (
  httpClient: HttpClient,
  authStorage: AuthStorage,
  notifications: NotificationService,
  config: ApiConfig,
  credentials: Partial<LoginCredentials>
): Promise<Result<boolean>> => {
  // Validate credentials
  const validationErrors = validateLoginCredentials(credentials);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: createApiError('Invalid credentials'),
      validationErrors
    };
  }

  const validCredentials = credentials as LoginCredentials;
  const requestBody = createLoginRequest(validCredentials);

  // Make HTTP request
  const fetchResult = await safeFetch(httpClient, `${config.baseUrl}/editor-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!fetchResult.success) {
    notifications.showError(`Login failed: ${fetchResult.error.message}`);
    return fetchResult;
  }

  const response = fetchResult.data;

  // Handle HTTP errors
  if (!response.ok) {
    const error = createApiError(`Login failed: ${response.status}`, response.status);
    notifications.showError(error.message);
    return { success: false, error };
  }

  // Parse JSON response
  const jsonResult = await safeJsonParse<LoginResponse>(response);
  if (!jsonResult.success) {
    notifications.showError('Invalid server response');
    return jsonResult;
  }

  // Validate response structure
  if (!isValidLoginResponse(jsonResult.data)) {
    const error = createApiError('Invalid login response format');
    notifications.showError(error.message);
    return { success: false, error };
  }

  const loginData = jsonResult.data;

  // Store credentials
  try {
    await authStorage.storeCredentials(validCredentials.username, loginData.token);
    notifications.showInfo('Login successful!');
    return { success: true, data: true };
  } catch (storageError) {
    const error = createApiError('Failed to store credentials');
    notifications.showError(error.message);
    return { success: false, error };
  }
};

// Search function calls operation
export const searchFunctionCallsOperation = async (
  httpClient: HttpClient,
  authStorage: AuthStorage,
  notifications: NotificationService,
  config: ApiConfig,
  functionNames: unknown,
  appName: unknown
): Promise<Result<ServerFunctionResponse | null>> => {
  // Validate function names
  if (!isValidFunctionNames(functionNames)) {
    return {
      success: false,
      error: createApiError('Invalid function names: must be non-empty array of strings'),
      validationErrors: ['Function names must be a non-empty array of strings']
    };
  }

  // Validate app name
  if (!isValidAppName(appName as string)) {
    return {
      success: false,
      error: createApiError('Invalid app name: must be non-empty string'),
      validationErrors: ['App name must be a non-empty string']
    };
  }

  // Check authentication
  const isAuthenticated = await authStorage.isAuthenticated();
  if (!isAuthenticated) {
    return {
      success: true,
      data: null // Not an error - just not authenticated
    };
  }

  const token = await authStorage.getToken();
  if (!token) {
    return {
      success: true,
      data: null // Not an error - just no token
    };
  }

  // Create request
  const searchRequest = createSearchRequest(functionNames as string[], appName as string);

  // Make HTTP request
  const fetchResult = await safeFetch(httpClient, `${config.baseUrl}/editor-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(searchRequest)
  });

  if (!fetchResult.success) {
    return fetchResult;
  }

  const response = fetchResult.data;

  // Handle specific HTTP errors
  if (!response.ok) {
    if (isUnauthorizedStatus(response.status)) {
      notifications.showWarning('Authentication expired. Please log in again.');
      return { success: true, data: null }; // Not a hard error
    }

    const error = createApiError(
      `Function call search failed: ${response.status} ${response.statusText}`,
      response.status
    );
    return { success: false, error };
  }

  // Parse JSON response
  const jsonResult = await safeJsonParse<ServerFunctionResponse>(response);
  if (!jsonResult.success) {
    return jsonResult;
  }

  // Validate response structure
  if (!isValidServerFunctionResponse(jsonResult.data)) {
    const error = createApiError('Invalid server function response format');
    return { success: false, error };
  }

  return { success: true, data: jsonResult.data };
};

// Request function watch operation
export const requestWatchOperation = async (
  httpClient: HttpClient,
  authStorage: AuthStorage,
  notifications: NotificationService,
  config: ApiConfig,
  functionNames: unknown,
  appName: unknown
): Promise<Result<WatchResponse>> => {
  // Validate function names
  if (!isValidFunctionNames(functionNames)) {
    return {
      success: false,
      error: createApiError('Invalid function names: must be non-empty array of strings'),
      validationErrors: ['Function names must be a non-empty array of strings']
    };
  }

  // Validate app name
  if (!isValidAppName(appName as string)) {
    return {
      success: false,
      error: createApiError('Invalid app name: must be non-empty string'),
      validationErrors: ['App name must be a non-empty string']
    };
  }

  // Check authentication
  const isAuthenticated = await authStorage.isAuthenticated();
  if (!isAuthenticated) {
    const error = createApiError('Authentication required to request function watches');
    notifications.showError(error.message);
    return { success: false, error };
  }

  const token = await authStorage.getToken();
  if (!token) {
    const error = createApiError('No authentication token found');
    notifications.showError(error.message);
    return { success: false, error };
  }

  // Create request
  const watchRequest = createWatchRequest(functionNames as string[], appName as string);

  // Make HTTP request
  const fetchResult = await safeFetch(httpClient, `${config.baseUrl}/editor-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(watchRequest)
  });

  if (!fetchResult.success) {
    const error = createApiError(`Watch request failed: ${fetchResult.error.message}`);
    notifications.showError(error.message);
    return fetchResult;
  }

  const response = fetchResult.data;

  // Handle specific HTTP errors
  if (!response.ok) {
    if (isUnauthorizedStatus(response.status)) {
      const error = createApiError('Authentication expired. Please log in again.');
      notifications.showWarning(error.message);
      return { success: false, error };
    }

    const error = createApiError(
      `Watch request failed: ${response.status} ${response.statusText}`,
      response.status
    );
    notifications.showError(error.message);
    return { success: false, error };
  }

  // Parse JSON response
  const jsonResult = await safeJsonParse<WatchResponse>(response);
  if (!jsonResult.success) {
    const error = createApiError('Invalid server response format');
    notifications.showError(error.message);
    return jsonResult;
  }

  // Validate response structure
  if (!isValidWatchResponse(jsonResult.data)) {
    const error = createApiError('Invalid watch response format');
    notifications.showError(error.message);
    return { success: false, error };
  }

  const watchResponse = jsonResult.data;

  // Handle server-side errors
  if (!watchResponse.success) {
    if (watchResponse.errors.length > 0) {
      const errorMessage = `Watch request failed: ${watchResponse.errors.join(', ')}`;
      notifications.showError(errorMessage);
      return { success: false, error: createApiError(errorMessage) };
    } else {
      const error = createApiError('Watch request failed for unknown reason');
      notifications.showError(error.message);
      return { success: false, error };
    }
  }

  // Success - show user notification
  const totalFunctions = watchResponse.watches_requested + watchResponse.already_watching;
  let message = `Function watch requests processed: ${totalFunctions} functions`;
  
  if (watchResponse.watches_requested > 0) {
    message += ` (${watchResponse.watches_requested} new watches)`;
  }
  
  if (watchResponse.already_watching > 0) {
    message += ` (${watchResponse.already_watching} already watching)`;
  }

  notifications.showInfo(message);
  return { success: true, data: watchResponse };
};

// Configuration operation
export const configureApiOperation = (
  currentConfig: ApiConfig,
  options: Partial<ApiConfig>
): Result<ApiConfig> => {
  try {
    const newConfig = normalizeApiConfig({ ...currentConfig, ...options });
    return { success: true, data: newConfig };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : createApiError('Configuration failed')
    };
  }
};