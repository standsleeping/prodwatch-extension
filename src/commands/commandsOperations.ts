import * as vscode from 'vscode';
import {
  LoginContext,
  WatchFunctionContext,
  RefreshDataContext,
  isValidLoginContext,
  isValidWatchFunctionContext,
  isValidRefreshDataContext,
  normalizeCredentials,
  createWatchFunctionContext,
  createRefreshDataContext,
  formatLoginSuccessMessage,
  formatWatchFunctionMessage,
  formatWatchFunctionLogMessage,
  formatRefreshDataMessage,
  createCommandError,
  createValidationError,
  ERROR_MESSAGES
} from './commandsCore';

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

export interface FileFocusServiceProvider {
  fetchDataForActiveFile(): Promise<void>;
}

export interface LoggerProvider {
  log(message: string): void;
}

export interface VSCodeProvider {
  showInputBox(options: vscode.InputBoxOptions): Thenable<string | undefined>;
  showInformationMessage(message: string): Thenable<string | undefined>;
  showErrorMessage(message: string): Thenable<string | undefined>;
  showWarningMessage(message: string): Thenable<string | undefined>;
  withProgress<R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>): Thenable<R>;
  getActiveTextEditor(): vscode.TextEditor | undefined;
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely execute login operation
 */
export const loginOperation = async (
  apiService: ApiServiceProvider,
  loginContext: LoginContext
): Promise<Result<string>> => {
  if (!isValidLoginContext(loginContext)) {
    return {
      success: false,
      error: createValidationError(ERROR_MESSAGES.INVALID_CREDENTIALS)
    };
  }

  try {
    const success = await apiService.login(loginContext.username, loginContext.password);
    
    if (!success) {
      return {
        success: false,
        error: createCommandError(ERROR_MESSAGES.LOGIN_FAILED, 'login')
      };
    }

    return {
      success: true,
      data: formatLoginSuccessMessage(loginContext.username)
    };
  } catch (error) {
    return {
      success: false,
      error: createCommandError(
        error instanceof Error ? error.message : String(error),
        'login operation'
      )
    };
  }
};

/**
 * Safely execute watch function operation
 */
export const watchFunctionOperation = (
  logger: LoggerProvider,
  watchContext: WatchFunctionContext
): Result<string> => {
  if (!isValidWatchFunctionContext(watchContext)) {
    return {
      success: false,
      error: createValidationError('Invalid watch function context')
    };
  }

  try {
    // Log the watch action
    const logMessage = formatWatchFunctionLogMessage(watchContext.functionName, watchContext.codeLensPath);
    logger.log(logMessage);

    // Return success message
    const successMessage = formatWatchFunctionMessage(watchContext.functionName);
    return {
      success: true,
      data: successMessage
    };
  } catch (error) {
    return {
      success: false,
      error: createCommandError(
        error instanceof Error ? error.message : String(error),
        'watch function operation'
      )
    };
  }
};

/**
 * Safely execute refresh data operation
 */
export const refreshDataOperation = async (
  fileFocusService: FileFocusServiceProvider,
  refreshContext: RefreshDataContext
): Promise<Result<string>> => {
  if (!isValidRefreshDataContext(refreshContext)) {
    return {
      success: false,
      error: createValidationError('Invalid refresh data context')
    };
  }

  if (!refreshContext.isActiveEditor || refreshContext.languageId !== 'python') {
    return {
      success: false,
      error: createCommandError(ERROR_MESSAGES.NOT_PYTHON_FILE, 'refresh data')
    };
  }

  try {
    await fileFocusService.fetchDataForActiveFile();
    return {
      success: true,
      data: formatRefreshDataMessage()
    };
  } catch (error) {
    return {
      success: false,
      error: createCommandError(
        error instanceof Error ? error.message : String(error),
        'refresh data operation'
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
        error: createCommandError('Username input cancelled', 'credential collection')
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
        error: createCommandError('Password input cancelled', 'credential collection')
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
      error: createCommandError(
        error instanceof Error ? error.message : String(error),
        'collecting credentials'
      )
    };
  }
};

/**
 * Safely get current editor context for refresh operation
 */
export const getCurrentEditorContextOperation = (
  vscodeProvider: VSCodeProvider
): Result<RefreshDataContext> => {
  try {
    const activeEditor = vscodeProvider.getActiveTextEditor();
    const context = createRefreshDataContext(
      activeEditor?.document.languageId || '',
      !!activeEditor
    );

    return {
      success: true,
      data: context
    };
  } catch (error) {
    return {
      success: false,
      error: createCommandError(
        error instanceof Error ? error.message : String(error),
        'getting editor context'
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

  // Execute login
  const loginResult = await loginOperation(apiService, credentialsResult.data);
  return loginResult;
};

/**
 * Complete refresh data command operation
 */
export const executeRefreshDataCommandOperation = async (
  fileFocusService: FileFocusServiceProvider,
  vscodeProvider: VSCodeProvider
): Promise<Result<string>> => {
  // Get current editor context
  const contextResult = getCurrentEditorContextOperation(vscodeProvider);
  if (!contextResult.success) {
    return contextResult;
  }

  // Execute refresh
  const refreshResult = await refreshDataOperation(fileFocusService, contextResult.data);
  return refreshResult;
};

/**
 * Complete watch function command operation
 */
export const executeWatchFunctionCommandOperation = (
  logger: LoggerProvider,
  functionName: string,
  codeLensPath: string
): Result<string> => {
  const watchContext = createWatchFunctionContext(functionName, codeLensPath);
  return watchFunctionOperation(logger, watchContext);
};