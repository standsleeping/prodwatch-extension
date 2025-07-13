/**
 * Core types and pure functions for set app name command functionality
 */

/**
 * Command context types
 */
export interface SetAppNameContext {
  appName: string;
}

/**
 * Pure validation functions
 */
export const isValidAppName = (appName: unknown): appName is string => {
  return typeof appName === 'string' && appName.trim().length > 0;
};

export const isValidSetAppNameContext = (context: unknown): context is SetAppNameContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const ctx = context as Partial<SetAppNameContext>;
  return isValidAppName(ctx.appName);
};

/**
 * Pure transformation functions
 */
export const normalizeAppName = (appName: string): string => {
  return appName.trim();
};

export const createSetAppNameContext = (appName: string): SetAppNameContext => ({
  appName: normalizeAppName(appName)
});

/**
 * Pure formatting functions
 */
export const formatSetAppNameSuccessMessage = (appName: string): string => {
  return `App name set to "${appName}". All ProdWatch function monitoring will now be scoped to this app.`;
};

/**
 * Pure error handling functions
 */
export const createSetAppNameError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Set app name error in ${context}: ${message}` : `Set app name error: ${message}`;
  return new Error(fullMessage);
};

export const createSetAppNameValidationError = (message: string): Error => {
  return new Error(message);
};

/**
 * Constants
 */
export const SET_APP_NAME_COMMAND_NAME = 'prodwatch.setAppName';

export const SET_APP_NAME_ERROR_MESSAGES = {
  EMPTY_APP_NAME: 'App name cannot be empty',
  SAVE_FAILED: 'Failed to save app name to workspace settings'
} as const;

export const SET_APP_NAME_INPUT_OPTIONS = {
  prompt: 'Enter the name of the app to monitor with ProdWatch',
  placeHolder: 'e.g., my-web-app',
  validateInput: (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'App name cannot be empty';
    }
    return null;
  }
} as const;