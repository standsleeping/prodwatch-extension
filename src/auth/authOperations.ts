import { Credentials, AuthState, validateCredentials, normalizeCredentials, createAuthState, createStorageError } from './authCore';
import { CredentialStorage, StorageResult, storeTokenSafely, getTokenSafely, storeUsernameSafely, getUsernameSafely, deleteTokenSafely, clearUsernameSafely } from './storage';

export interface AuthKeys {
  token: string;
  username: string;
}

export type AuthOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error; validationErrors?: string[] };

export const storeCredentialsOperation = async (
  storage: CredentialStorage,
  keys: AuthKeys,
  credentials: Partial<Credentials>
): Promise<AuthOperationResult<void>> => {
  const normalizedCreds = normalizeCredentials(credentials);
  const validationErrors = validateCredentials(normalizedCreds);

  if (validationErrors.length > 0) {
    return {
      success: false,
      error: new Error('Invalid credentials'),
      validationErrors
    };
  }

  const tokenResult = await storeTokenSafely(storage.secrets, keys.token, normalizedCreds.token);
  if (!tokenResult.success) {
    return {
      success: false,
      error: createStorageError('store', tokenResult.error)
    };
  }

  const usernameResult = await storeUsernameSafely(storage.globalState, keys.username, normalizedCreds.username);
  if (!usernameResult.success) {
    return {
      success: false,
      error: createStorageError('store', usernameResult.error)
    };
  }

  return { success: true, data: undefined };
};

export const getCredentialsOperation = async (
  storage: CredentialStorage,
  keys: AuthKeys
): Promise<AuthOperationResult<{ token?: string; username?: string }>> => {
  const tokenResult = await getTokenSafely(storage.secrets, keys.token);
  const usernameResult = getUsernameSafely(storage.globalState, keys.username);

  // If either operation failed, return the error but don't fail completely.
  // This allows partial retrieval.
  const token = tokenResult.success ? tokenResult.data : undefined;
  const username = usernameResult.success ? usernameResult.data : undefined;

  return {
    success: true,
    data: { token, username }
  };
};

export const getAuthStateOperation = async (
  storage: CredentialStorage,
  keys: AuthKeys
): Promise<AuthOperationResult<AuthState>> => {
  const credentialsResult = await getCredentialsOperation(storage, keys);

  if (!credentialsResult.success) {
    return credentialsResult;
  }

  const { token, username } = credentialsResult.data;
  const authState = createAuthState(token, username);

  return { success: true, data: authState };
};

export const clearCredentialsOperation = async (
  storage: CredentialStorage,
  keys: AuthKeys
): Promise<AuthOperationResult<void>> => {
  const tokenResult = await deleteTokenSafely(storage.secrets, keys.token);
  const usernameResult = await clearUsernameSafely(storage.globalState, keys.username);

  // If either operation failed, return error.
  if (!tokenResult.success) {
    return {
      success: false,
      error: createStorageError('clear', tokenResult.error)
    };
  }

  if (!usernameResult.success) {
    return {
      success: false,
      error: createStorageError('clear', usernameResult.error)
    };
  }

  return { success: true, data: undefined };
};