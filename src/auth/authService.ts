import * as vscode from 'vscode';

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
      console.error('Failed to store credentials:', error);
      throw new Error('Failed to securely store credentials');
    }
  }
}