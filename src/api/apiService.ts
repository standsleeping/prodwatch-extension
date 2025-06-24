import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';
import Logger from '../utils/logger';

/**
 * Interface for individual function call data
 */
export interface FunctionCallData {
  calls: any[]; // Array of call details from server
  total_calls: number;
}

/**
 * Interface for function data response from server
 */
export interface ServerFunctionResponse {
  function_names: string[];
  total_calls: number;
  functions: {
    [functionName: string]: FunctionCallData;
  };
}

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
      Logger.error('Login error', error instanceof Error ? error : new Error(String(error)));
      vscode.window.showErrorMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Search for function calls using the /editor-events endpoint
   */
  public async searchFunctionCalls(functionNames: string[]): Promise<ServerFunctionResponse | null> {
    try {
      // Check if user is authenticated
      const isAuth = await this.authService.isAuthenticated();
      if (!isAuth) {
        Logger.log('Cannot search function calls: User not authenticated');
        return null;
      }

      const token = await this.authService.getToken();
      if (!token) {
        Logger.log('Cannot search function calls: No auth token available');
        return null;
      }

      Logger.log(`Searching function calls for ${functionNames.length} functions: ${functionNames.join(', ')}`);

      const requestBody = {
        event_name: "search-function-calls",
        function_names: functionNames
      };

      Logger.log(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(`${this.baseUrl}/editor-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          Logger.log('Function call search failed: Unauthorized (token may be expired)');
          vscode.window.showWarningMessage('Authentication expired. Please log in again.');
          return null;
        }
        throw new Error(`Function call search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as ServerFunctionResponse;
      Logger.log(`Successfully received call data. Total calls: ${data.total_calls}, Functions: ${data.function_names.length}`);

      return data;
    } catch (error) {
      Logger.error('Error searching function calls', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }
}