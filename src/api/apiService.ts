import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';

/**
 * Service for handling API communication with the server
 */
export class ApiService {
  private static instance: ApiService;
  private authService: AuthService;

  // Base URL for API requests
  private baseUrl: string = 'https://getprodwatch.com';

  private constructor(context: vscode.ExtensionContext) {
    this.authService = AuthService.getInstance(context);
  }

  /**
   * Get the singleton instance of ApiService
   */
  public static getInstance(context: vscode.ExtensionContext): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService(context);
    }
    return ApiService.instance;
  }

  /**
   * Configure the API service
   */
  public configure(options: { baseUrl?: string }): void {
    if (options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
  }

  /**
   * Send a login request to the server
   */
  public async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/editor-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const data = await response.json() as { token: string; user_id: string; email: string };

      if (data.token) {
        // Store the credentials
        await this.authService.storeCredentials(username, data.token);
        
        vscode.window.showInformationMessage('Login successful!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}