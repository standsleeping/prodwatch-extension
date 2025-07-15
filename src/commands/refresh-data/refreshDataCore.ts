/**
 * Core types and pure functions for refresh data command functionality
 */

/**
 * Command context types
 */
export interface RefreshDataContext {
  languageId: string;
  isActiveEditor: boolean;
}

/**
 * Pure validation functions
 */
export const isValidLanguageId = (languageId: unknown): languageId is string => {
  return typeof languageId === 'string';
};

export const isValidRefreshDataContext = (context: unknown): context is RefreshDataContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const rdc = context as Partial<RefreshDataContext>;
  return isValidLanguageId(rdc.languageId) && typeof rdc.isActiveEditor === 'boolean';
};

/**
 * Pure transformation functions
 */
export const createRefreshDataContext = (languageId: string, isActiveEditor: boolean): RefreshDataContext => ({
  languageId,
  isActiveEditor
});

/**
 * Pure formatting functions
 */
export const formatRefreshDataMessage = (): string => {
  return 'Function data refreshed successfully';
};

/**
 * Pure error handling functions
 */
export const createRefreshDataError = (message: string, context?: string): Error => {
  return new Error(message);
};

export const createRefreshDataValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isRefreshDataError = (error: unknown): error is Error => {
  return error instanceof Error;
};

export const isRefreshDataValidationError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Constants
 */
export const REFRESH_DATA_COMMAND_NAME = 'prodwatch.refreshData';

export const REFRESH_DATA_ERROR_MESSAGES = {
  NOT_PYTHON_FILE: 'Please open a Python file to refresh function data',
  REFRESH_FAILED: 'Failed to refresh function data'
} as const;

export const REFRESH_DATA_SUCCESS_MESSAGES = {
  DATA_REFRESHED: 'Function data refreshed successfully'
} as const;