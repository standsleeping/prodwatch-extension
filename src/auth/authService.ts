import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { AuthState } from './authCore';
import { CredentialStorage, SecureStorage, GeneralStorage } from './storage';
import { AuthKeys, storeCredentialsOperation, getCredentialsOperation, getAuthStateOperation, clearCredentialsOperation } from './authOperations';

/**
 * VS Code specific storage adapter
 */
const createVSCodeStorage = (context: vscode.ExtensionContext): CredentialStorage => ({
  secrets: {
    get: (key: string) => context.secrets.get(key),
    store: (key: string, value: string) => context.secrets.store(key, value),
    delete: (key: string) => context.secrets.delete(key)
  } as SecureStorage,
  globalState: {
    get: <T>(key: string) => context.globalState.get<T>(key),
    update: (key: string, value: any) => context.globalState.update(key, value)
  } as GeneralStorage
});

/**
 * Service for handling authentication credentials in the extension
 * Now uses functional core with imperative shell pattern
 */
export class AuthService {
  private static instance: AuthService;
  private storage: CredentialStorage;
  private keys: AuthKeys;

  private constructor(context: vscode.ExtensionContext) {
    this.storage = createVSCodeStorage(context);
    this.keys = {
      token: 'prodwatch.authToken',
      username: 'prodwatch.username'
    };
  }

  public static getInstance(context: vscode.ExtensionContext): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(context);
    }
    return AuthService.instance;
  }

  public async storeCredentials(username: string, token: string): Promise<void> {
    const result = await storeCredentialsOperation(this.storage, this.keys, { username, token });
    
    if (!result.success) {
      Logger.error('Failed to store credentials', result.error);
      throw result.error;
    }
  }

  public async getToken(): Promise<string | undefined> {
    const result = await getCredentialsOperation(this.storage, this.keys);
    
    if (!result.success) {
      Logger.error('Failed to retrieve credentials', result.error);
      return undefined;
    }
    
    return result.data.token;
  }

  public getUsername(): string | undefined {
    // This could be made async in the future if needed
    try {
      return this.storage.globalState.get<string>(this.keys.username);
    } catch (error) {
      Logger.error('Failed to retrieve username', error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }

  public async isAuthenticated(): Promise<boolean> {
    const result = await getAuthStateOperation(this.storage, this.keys);
    
    if (!result.success) {
      Logger.error('Failed to check authentication state', result.error);
      return false;
    }
    
    return result.data.isAuthenticated;
  }

  public async getAuthState(): Promise<AuthState> {
    const result = await getAuthStateOperation(this.storage, this.keys);
    
    if (!result.success) {
      Logger.error('Failed to get auth state', result.error);
      return { isAuthenticated: false };
    }
    
    return result.data;
  }

  public async clearCredentials(): Promise<void> {
    const result = await clearCredentialsOperation(this.storage, this.keys);
    
    if (!result.success) {
      Logger.error('Failed to clear credentials', result.error);
      throw result.error;
    }
  }
}