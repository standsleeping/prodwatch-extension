import { ServerFunctionResponse, FunctionCallData } from '../api/apiService';
import {
  FunctionData,
  FunctionCallFormatOptions,
  DEFAULT_PLACEHOLDER_DATA,
  isValidServerResponse,
  isValidCodeLensPath,
  isValidFunctionCallData,
  convertCallsToDataPoints,
  createFunctionData,
  createValidationError,
  createFormatError
} from './functionDataCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface for function data storage abstraction
 */
export interface FunctionDataStorage {
  get(codeLensPath: string): FunctionData | undefined;
  set(codeLensPath: string, data: FunctionData): void;
  has(codeLensPath: string): boolean;
  delete(codeLensPath: string): boolean;
  clear(): void;
  keys(): string[];
  size(): number;
}

/**
 * Interface for function data dependencies
 */
export interface FunctionDataDependencies {
  storage: FunctionDataStorage;
  formatOptions?: FunctionCallFormatOptions;
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely retrieve function data
 */
export const getFunctionDataOperation = (
  storage: FunctionDataStorage,
  codeLensPath: string
): Result<FunctionData | null> => {
  // Validate input
  if (!isValidCodeLensPath(codeLensPath)) {
    return {
      success: false,
      error: createValidationError('Invalid code lens path', 'codeLensPath')
    };
  }

  try {
    const data = storage.get(codeLensPath);
    return {
      success: true,
      data: data || null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Safely check if function data exists
 */
export const hasFunctionDataOperation = (
  storage: FunctionDataStorage,
  codeLensPath: string
): Result<boolean> => {
  // Validate input
  if (!isValidCodeLensPath(codeLensPath)) {
    return {
      success: false,
      error: createValidationError('Invalid code lens path', 'codeLensPath')
    };
  }

  try {
    const hasData = storage.has(codeLensPath);
    return {
      success: true,
      data: hasData
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Safely get all function paths
 */
export const getAllFunctionPathsOperation = (
  storage: FunctionDataStorage
): Result<string[]> => {
  try {
    const paths = storage.keys();
    return {
      success: true,
      data: [...paths] // Immutable copy
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Safely clear all function data
 */
export const clearAllDataOperation = (
  storage: FunctionDataStorage
): Result<void> => {
  try {
    storage.clear();
    return {
      success: true,
      data: undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Safely process a single function's call data
 */
export const processFunctionCallDataOperation = (
  functionPath: string,
  callData: FunctionCallData,
  options?: FunctionCallFormatOptions
): Result<FunctionData> => {
  // Validate inputs
  if (!isValidCodeLensPath(functionPath)) {
    return {
      success: false,
      error: createValidationError('Invalid function path', 'functionPath')
    };
  }

  if (!isValidFunctionCallData(callData)) {
    return {
      success: false,
      error: createValidationError('Invalid function call data', 'callData')
    };
  }

  try {
    const dataPoints = convertCallsToDataPoints(functionPath, callData, options);
    const functionData = createFunctionData(functionPath, dataPoints, callData);

    return {
      success: true,
      data: functionData
    };
  } catch (error) {
    return {
      success: false,
      error: createFormatError(
        error instanceof Error ? error.message : String(error),
        `processing ${functionPath}`
      )
    };
  }
};

/**
 * Safely update function data from server response
 */
export const updateFromServerResponseOperation = (
  storage: FunctionDataStorage,
  modulePath: string,
  serverResponse: ServerFunctionResponse,
  options?: FunctionCallFormatOptions
): Result<{ updatedCount: number; functionPaths: string[] }> => {
  // Validate inputs
  if (!modulePath || typeof modulePath !== 'string') {
    return {
      success: false,
      error: createValidationError('Invalid module path', 'modulePath')
    };
  }

  if (!isValidServerResponse(serverResponse)) {
    return {
      success: false,
      error: createValidationError('Invalid server response', 'serverResponse')
    };
  }

  const updatedPaths: string[] = [];
  const errors: Error[] = [];

  // Process each function in the response
  for (const [functionPath, callData] of Object.entries(serverResponse.functions)) {
    const processResult = processFunctionCallDataOperation(functionPath, callData, options);

    if (processResult.success) {
      try {
        storage.set(functionPath, processResult.data);
        updatedPaths.push(functionPath);
      } catch (error) {
        errors.push(
          createFormatError(
            error instanceof Error ? error.message : String(error),
            `storing data for ${functionPath}`
          )
        );
      }
    } else {
      errors.push(processResult.error);
    }
  }

  // If we had some successes, return partial success with warnings
  if (updatedPaths.length > 0) {
    return {
      success: true,
      data: {
        updatedCount: updatedPaths.length,
        functionPaths: updatedPaths
      }
    };
  }

  // If no successes, return the first error
  return {
    success: false,
    error: errors[0] || createFormatError('Unknown error during server response processing')
  };
};

/**
 * Safely get function data with fallback to placeholder
 */
export const getFunctionDataWithPlaceholderOperation = (
  storage: FunctionDataStorage,
  codeLensPath: string
): Result<FunctionData> => {
  const getResult = getFunctionDataOperation(storage, codeLensPath);

  if (!getResult.success) {
    return getResult;
  }

  // If no data found, return placeholder data
  if (getResult.data === null) {
    const placeholderData = createFunctionData(codeLensPath, DEFAULT_PLACEHOLDER_DATA);
    return {
      success: true,
      data: placeholderData
    };
  }

  return {
    success: true,
    data: getResult.data
  };
};

/**
 * Safely validate and prepare server response for processing
 */
export const validateServerResponseOperation = (
  serverResponse: unknown
): Result<ServerFunctionResponse> => {
  if (!isValidServerResponse(serverResponse)) {
    return {
      success: false,
      error: createValidationError('Invalid server response format', 'serverResponse')
    };
  }

  return {
    success: true,
    data: serverResponse
  };
};

/**
 * Get storage statistics
 */
export const getStorageStatsOperation = (
  storage: FunctionDataStorage
): Result<{ totalFunctions: number; functionPaths: string[] }> => {
  try {
    const paths = storage.keys();
    return {
      success: true,
      data: {
        totalFunctions: storage.size(),
        functionPaths: [...paths]
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};