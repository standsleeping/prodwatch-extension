/**
 * Core types and pure functions for watch function command functionality
 */

/**
 * Command context types
 */
export interface WatchFunctionContext {
  functionName: string;
  codeLensPath: string;
}

/**
 * Pure validation functions
 */
export const isValidFunctionName = (functionName: unknown): functionName is string => {
  return typeof functionName === 'string' && 
         functionName.length > 0 && 
         /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName);
};

export const isValidCodeLensPath = (codeLensPath: unknown): codeLensPath is string => {
  return typeof codeLensPath === 'string' && codeLensPath.includes('.');
};

export const isValidWatchFunctionContext = (context: unknown): context is WatchFunctionContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const wfc = context as Partial<WatchFunctionContext>;
  return isValidFunctionName(wfc.functionName) && isValidCodeLensPath(wfc.codeLensPath);
};

/**
 * Pure transformation functions
 */
export const createWatchFunctionContext = (functionName: string, codeLensPath: string): WatchFunctionContext => ({
  functionName: functionName.trim(),
  codeLensPath: codeLensPath.trim()
});

/**
 * Pure formatting functions
 */
export const formatWatchFunctionMessage = (functionName: string): string => {
  return `Started watching function: ${functionName}`;
};

export const formatWatchFunctionLogMessage = (functionName: string, codeLensPath: string): string => {
  return `Watch button clicked for function: ${functionName} (${codeLensPath})`;
};

/**
 * Pure error handling functions
 */
export const createWatchFunctionError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Watch function error in ${context}: ${message}` : `Watch function error: ${message}`;
  return new Error(fullMessage);
};

export const createWatchFunctionValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isWatchFunctionError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Watch function error');
};

export const isWatchFunctionValidationError = (error: unknown): error is Error => {
  return error instanceof Error && !error.message.includes('Watch function error');
};

/**
 * Constants
 */
export const WATCH_FUNCTION_COMMAND_NAME = 'prodwatch.watchFunction';

export const WATCH_FUNCTION_ERROR_MESSAGES = {
  WATCH_FUNCTION_FAILED: 'Failed to watch function'
} as const;