export interface Credentials {
  username: string;
  token: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  username?: string;
}

export const isValidToken = (token: string | undefined): boolean => {
  return typeof token === 'string' && token.length > 0;
};

export const isValidUsername = (username: string | undefined): boolean => {
  return typeof username === 'string' && username.length > 0;
};

export const validateCredentials = (credentials: Partial<Credentials>): string[] => {
  const errors: string[] = [];
  
  if (!isValidUsername(credentials.username)) {
    errors.push('Username is required and must be non-empty');
  }
  
  if (!isValidToken(credentials.token)) {
    errors.push('Token is required and must be non-empty');
  }
  
  return errors;
};

export const createAuthState = (token: string | undefined, username: string | undefined): AuthState => {
  return {
    isAuthenticated: isValidToken(token),
    username: isValidUsername(username) ? username : undefined
  };
};

export const normalizeCredentials = (credentials: Partial<Credentials>): Credentials => {
  return {
    username: (credentials.username || '').trim(),
    token: (credentials.token || '').trim()
  };
};

export const createStorageError = (operation: string, originalError?: Error): Error => {
  const message = `Failed to ${operation} credentials`;
  const error = new Error(message);
  if (originalError) {
    error.cause = originalError;
  }
  return error;
};

export const isStorageError = (error: unknown): error is Error => {
  return error instanceof Error;
};