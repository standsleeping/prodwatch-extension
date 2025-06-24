import * as vscode from 'vscode';
import Logger from '../utils/logger';

/**
 * Service for handling authentication credentials in the extension
 */
export class AuthService {
  private static instance: AuthService;
  private extensionContext: vscode.ExtensionContext;

  // Credential keys
  private readonly TOKEN_KEY = 'prodwatch.authToken';
  private readonly USER_KEY = 'prodwatch.username';

  private constructor(context: vscode.ExtensionContext) {
    this.extensionContext = context;
  }

  /**
   * Get the singleton instance of AuthService
   */
  public static getInstance(context: vscode.ExtensionContext): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(context);
    }
    return AuthService.instance;
  }

  /**
   * Store authentication credentials securely
   */
  public async storeCredentials(username: string, token: string): Promise<void> {
    try {
      await this.extensionContext.secrets.store(this.TOKEN_KEY, token);
      await this.extensionContext.globalState.update(this.USER_KEY, username);
    } catch (error) {
      Logger.error('Failed to store credentials', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to securely store credentials');
    }
  }

  /**
   * Retrieve stored authentication token
   */
  public async getToken(): Promise<string | undefined> {
    try {
      return await this.extensionContext.secrets.get(this.TOKEN_KEY);
    } catch (error) {
      Logger.error('Failed to retrieve token', error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }

  /**
   * Retrieve stored username
   */
  public getUsername(): string | undefined {
    try {
      return this.extensionContext.globalState.get(this.USER_KEY);
    } catch (error) {
      Logger.error('Failed to retrieve username', error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }

  /**
   * Check if user is authenticated
   */
  public async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Clear stored credentials
   */
  public async clearCredentials(): Promise<void> {
    try {
      await this.extensionContext.secrets.delete(this.TOKEN_KEY);
      await this.extensionContext.globalState.update(this.USER_KEY, undefined);
    } catch (error) {
      Logger.error('Failed to clear credentials', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to clear credentials');
    }
  }
}