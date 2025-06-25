export interface SecureStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface GeneralStorage {
  get<T>(key: string): T | undefined;
  update(key: string, value: any): Promise<void>;
}

export interface CredentialStorage {
  secrets: SecureStorage;
  globalState: GeneralStorage;
}

export type StorageResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

export const storeTokenSafely = async (
  storage: SecureStorage,
  key: string,
  token: string
): Promise<StorageResult<void>> => {
  try {
    await storage.store(key, token);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

export const getTokenSafely = async (
  storage: SecureStorage,
  key: string
): Promise<StorageResult<string | undefined>> => {
  try {
    const token = await storage.get(key);
    return { success: true, data: token };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

export const storeUsernameSafely = async (
  storage: GeneralStorage,
  key: string,
  username: string
): Promise<StorageResult<void>> => {
  try {
    await storage.update(key, username);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

export const getUsernameSafely = (
  storage: GeneralStorage,
  key: string
): StorageResult<string | undefined> => {
  try {
    const username = storage.get<string>(key);
    return { success: true, data: username };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

export const deleteTokenSafely = async (
  storage: SecureStorage,
  key: string
): Promise<StorageResult<void>> => {
  try {
    await storage.delete(key);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

export const clearUsernameSafely = async (
  storage: GeneralStorage,
  key: string
): Promise<StorageResult<void>> => {
  try {
    await storage.update(key, undefined);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};