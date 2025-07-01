/**
 * Core types and pure functions for login command functionality
 */

/**
 * Command context types
 */
export interface LoginContext {
  username: string;
  password: string;
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

export const isValidLoginContext = (context: unknown): context is LoginContext => {
  if (!context || typeof context !== 'object') {
    return false;
  }
  const lc = context as Partial<LoginContext>;
  return isValidUsername(lc.username) && isValidPassword(lc.password);
};

/**
 * Pure transformation functions
 */
export const normalizeCredentials = (username: string, password: string): LoginContext => ({
  username: username.trim(),
  password: password.trim()
});

/**
 * Pure formatting functions
 */
export const formatLoginSuccessMessage = (username: string): string => {
  return `Logged in successfully as ${username}`;
};

/**
 * Pure error handling functions
 */
export const createLoginError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Login error in ${context}: ${message}` : `Login error: ${message}`;
  return new Error(fullMessage);
};

export const createLoginValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isLoginError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Login error');
};

export const isLoginValidationError = (error: unknown): error is Error => {
  return error instanceof Error && !error.message.includes('Login error');
};

/**
 * Constants
 */
export const LOGIN_COMMAND_NAME = 'prodwatch.login';

export const LOGIN_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid username or password',
  LOGIN_FAILED: 'Login failed. Please check your credentials and try again.'
} as const;