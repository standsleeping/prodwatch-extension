import * as vscode from 'vscode';
import { AuthService } from '../auth/authService';
import Logger from '../utils/logger';

/**
 * Interface for individual function call record
 */
export interface FunctionCall {
  function_name: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  execution_time_ms?: number;
  error?: string;
  timestamp?: string;
}

/**
 * Enum for function watch status
 */
export enum WatchStatus {
  NOT_REQUESTED = 'not_requested',
  PENDING = 'pending',
  FAILED = 'failed',
  ACTIVE = 'active',
  MIXED_STATES = 'mixed_states'
}

/**
 * Interface for individual function call data
 */
export interface FunctionCallData {
  calls: FunctionCall[];
  total_calls: number;
  watch_status: WatchStatus;
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
   * Request function watches using the /editor-events endpoint
   */
  public async requestWatch(functionNames: string[]): Promise<boolean> {
    try {
      // Check if user is authenticated
      const isAuth = await this.authService.isAuthenticated();
      if (!isAuth) {
        Logger.log('Cannot request function watches: User not authenticated');
        vscode.window.showErrorMessage('Authentication required to request function watches');
        return false;
      }

      const token = await this.authService.getToken();
      if (!token) {
        Logger.log('Cannot request function watches: No auth token available');
        vscode.window.showErrorMessage('No authentication token found');
        return false;
      }

      // Get app name from workspace settings
      const config = vscode.workspace.getConfiguration('prodwatch');
      const appName = config.get<string>('appName');
      
      if (!appName) {
        Logger.log('Cannot request function watches: App name not configured');
        vscode.window.showErrorMessage('App name not configured. Please run "ProdWatch: Set App Name" command first.');
        return false;
      }

      Logger.log(`Requesting watches for ${functionNames.length} functions: ${functionNames.join(', ')} in app: ${appName}`);

      const requestBody = {
        event_name: "request-function-watch",
        function_names: functionNames,
        app_name: appName
      };

      Logger.log(`Watch request body: ${JSON.stringify(requestBody)}`);

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
          Logger.log('Function watch request failed: Unauthorized (token may be expired)');
          vscode.window.showWarningMessage('Authentication expired. Please log in again.');
          return false;
        }
        throw new Error(`Watch request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { success: boolean; watches_requested: number; already_watching: number; errors: string[] };
      Logger.log(`Watch request response: ${JSON.stringify(data)}`);

      if (!data.success) {
        if (data.errors && data.errors.length > 0) {
          const errorMessage = `Watch request failed: ${data.errors.join(', ')}`;
          vscode.window.showErrorMessage(errorMessage);
          Logger.error('Watch request failed', new Error(errorMessage));
        } else {
          vscode.window.showErrorMessage('Watch request failed for unknown reason');
          Logger.error('Watch request failed', new Error('Unknown reason'));
        }
        return false;
      }

      // Success - show user notification
      const totalFunctions = data.watches_requested + data.already_watching;
      let message = `Function watch requests processed: ${totalFunctions} functions`;
      
      if (data.watches_requested > 0) {
        message += ` (${data.watches_requested} new watches)`;
      }
      
      if (data.already_watching > 0) {
        message += ` (${data.already_watching} already watching)`;
      }

      vscode.window.showInformationMessage(message);
      Logger.log(message);
      return true;

    } catch (error) {
      Logger.error('Error requesting function watches', error instanceof Error ? error : new Error(String(error)));
      vscode.window.showErrorMessage(`Watch request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      // Get app name from workspace settings
      const config = vscode.workspace.getConfiguration('prodwatch');
      const appName = config.get<string>('appName');
      
      if (!appName) {
        Logger.log('Cannot search function calls: App name not configured');
        vscode.window.showErrorMessage('App name not configured. Please run "ProdWatch: Set App Name" command first.');
        return null;
      }

      Logger.log(`Searching function calls for ${functionNames.length} functions: ${functionNames.join(', ')} in app: ${appName}`);

      const requestBody = {
        event_name: "search-function-calls",
        function_names: functionNames,
        app_name: appName
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