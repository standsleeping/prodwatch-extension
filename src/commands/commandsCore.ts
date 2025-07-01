/**
 * Core types and pure functions for command functionality
 */

/**
 * Command context types
 */
export interface LoginContext {
  username: string;
  password: string;
}

export interface WatchFunctionContext {
  functionName: string;
  codeLensPath: string;
}

export interface RefreshDataContext {
  languageId: string;
  isActiveEditor: boolean;
}

/**
 * Pure validation functions
 */
export const isValidUsername = (username: unknown): username is string => {
  return typeof username === 'string' && username.trim().length > 0;
};

export const isValidPassword = (password: unknown): password is string => {
  return typeof password === 'string' && password.trim().length > 0;
};

export const isValidFunctionName = (functionName: unknown): functionName is string => {
  return typeof functionName === 'string' && 
         functionName.length > 0 && 
         /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName);
};

export const isValidCodeLensPath = (codeLensPath: unknown): codeLensPath is string => {
  return typeof codeLensPath === 'string' && codeLensPath.includes('.');
};

export const isValidLanguageId = (languageId: unknown): languageId is string => {
  return typeof languageId === 'string';
};

export const isValidLoginContext = (context: unknown): context is LoginContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const lc = context as Partial<LoginContext>;
  return isValidUsername(lc.username) && isValidPassword(lc.password);
};

export const isValidWatchFunctionContext = (context: unknown): context is WatchFunctionContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const wfc = context as Partial<WatchFunctionContext>;
  return isValidFunctionName(wfc.functionName) && isValidCodeLensPath(wfc.codeLensPath);
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
export const normalizeCredentials = (username: string, password: string): LoginContext => ({
  username: username.trim(),
  password: password.trim()
});

export const createWatchFunctionContext = (functionName: string, codeLensPath: string): WatchFunctionContext => ({
  functionName: functionName.trim(),
  codeLensPath: codeLensPath.trim()
});

export const createRefreshDataContext = (languageId: string, isActiveEditor: boolean): RefreshDataContext => ({
  languageId,
  isActiveEditor
});

/**
 * Pure formatting functions
 */
export const formatLoginSuccessMessage = (username: string): string => {
  return `Logged in successfully as ${username}`;
};

export const formatWatchFunctionMessage = (functionName: string): string => {
  return `Started watching function: ${functionName}`;
};

export const formatWatchFunctionLogMessage = (functionName: string, codeLensPath: string): string => {
  return `Watch button clicked for function: ${functionName} (${codeLensPath})`;
};

export const formatRefreshDataMessage = (): string => {
  return 'Function data refreshed successfully';
};

/**
 * Pure error handling functions
 */
export const createCommandError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Command error in ${context}: ${message}` : `Command error: ${message}`;
  return new Error(fullMessage);
};

export const createValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isCommandError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Command error');
};

export const isValidationError = (error: unknown): error is Error => {
  return error instanceof Error && !error.message.includes('Command error');
};

/**
 * Constants
 */
export const COMMAND_NAMES = {
  LOGIN: 'prodwatch.login',
  REFRESH_DATA: 'prodwatch.refreshData',
  WATCH_FUNCTION: 'prodwatch.watchFunction'
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  LOGIN_FAILED: 'Login failed. Please check your credentials and try again.',
  NOT_PYTHON_FILE: 'Please open a Python file to refresh function data',
  REFRESH_FAILED: 'Failed to refresh function data',
  WATCH_FUNCTION_FAILED: 'Failed to watch function'
} as const;

export const SUCCESS_MESSAGES = {
  DATA_REFRESHED: 'Function data refreshed successfully'
} as const;