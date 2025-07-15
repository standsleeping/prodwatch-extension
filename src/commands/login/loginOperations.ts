import * as vscode from 'vscode';
import {
  LoginContext,
  isValidLoginContext,
  normalizeCredentials,
  formatLoginSuccessMessage,
  createLoginError,
  createLoginValidationError,
  LOGIN_ERROR_MESSAGES
} from './loginCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface abstractions for dependencies
 */
export interface ApiServiceProvider {
  login(username: string, password: string): Promise<boolean>;
}

export interface VSCodeProvider {
  showInputBox(options: vscode.InputBoxOptions): Thenable<string | undefined>;
  showInformationMessage(message: string): Thenable<string | undefined>;
  showErrorMessage(message: string): Thenable<string | undefined>;
  withProgress<R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>): Thenable<R>;
}

export interface FileFocusServiceProvider {
  fetchDataForActiveFile(): Promise<boolean>;
}

export interface LoggerProvider {
  log(message: string): void;
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely execute login operation with progress indication
 */
export const loginOperation = async (
  apiService: ApiServiceProvider,
  vscodeProvider: VSCodeProvider,
  loginContext: LoginContext
): Promise<Result<string>> => {
  if (!isValidLoginContext(loginContext)) {
    return {
      success: false,
      error: createLoginValidationError(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS)
    };
  }

  try {
    // Show progress only during the actual API request
    const success = await vscodeProvider.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging in...',
      cancellable: false
    }, async () => {
      return await apiService.login(loginContext.username, loginContext.password);
    });
    
    if (!success) {
      return {
        success: false,
        error: createLoginError(LOGIN_ERROR_MESSAGES.LOGIN_FAILED, 'login')
      };
    }

    return {
      success: true,
      data: formatLoginSuccessMessage(loginContext.username)
    };
  } catch (error) {
    return {
      success: false,
      error: createLoginError(
        error instanceof Error ? error.message : String(error),
        'login operation'
      )
    };
  }
};

/**
 * Safely collect login credentials from user input
 */
export const collectLoginCredentialsOperation = async (
  vscodeProvider: VSCodeProvider
): Promise<Result<LoginContext>> => {
  try {
    const username = await vscodeProvider.showInputBox({
      placeHolder: 'Username',
      prompt: 'Enter your username'
    });

    if (!username) {
      return {
        success: false,
        error: createLoginError('Username input cancelled', 'credential collection')
      };
    }

    const password = await vscodeProvider.showInputBox({
      placeHolder: 'Password',
      prompt: 'Enter your password',
      password: true
    });

    if (!password) {
      return {
        success: false,
        error: createLoginError('Password input cancelled', 'credential collection')
      };
    }

    const credentials = normalizeCredentials(username, password);
    return {
      success: true,
      data: credentials
    };
  } catch (error) {
    return {
      success: false,
      error: createLoginError(
        error instanceof Error ? error.message : String(error),
        'collecting credentials'
      )
    };
  }
};

/**
 * Complete login command operation
 */
export const executeLoginCommandOperation = async (
  apiService: ApiServiceProvider,
  vscodeProvider: VSCodeProvider
): Promise<Result<string>> => {
  // Collect credentials
  const credentialsResult = await collectLoginCredentialsOperation(vscodeProvider);
  if (!credentialsResult.success) {
    return credentialsResult;
  }

  // Execute login with progress indication
  const loginResult = await loginOperation(apiService, vscodeProvider, credentialsResult.data);
  return loginResult;
};