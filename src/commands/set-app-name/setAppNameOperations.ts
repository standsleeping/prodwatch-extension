import * as vscode from 'vscode';
import {
  SetAppNameContext,
  isValidSetAppNameContext,
  createSetAppNameContext,
  formatSetAppNameSuccessMessage,
  createSetAppNameError,
  createSetAppNameValidationError,
  SET_APP_NAME_ERROR_MESSAGES,
  SET_APP_NAME_INPUT_OPTIONS
} from './setAppNameCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface abstractions for dependencies
 */
export interface VSCodeProvider {
  showInputBox(options: vscode.InputBoxOptions): Thenable<string | undefined>;
  showInformationMessage(message: string): Thenable<string | undefined>;
  showErrorMessage(message: string): Thenable<string | undefined>;
}

export interface WorkspaceConfigProvider {
  getConfiguration(section: string): vscode.WorkspaceConfiguration;
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely execute set app name operation
 */
export const setAppNameOperation = async (
  workspaceConfig: WorkspaceConfigProvider,
  appNameContext: SetAppNameContext
): Promise<Result<string>> => {
  try {
    if (!isValidSetAppNameContext(appNameContext)) {
      return {
        success: false,
        error: createSetAppNameValidationError(SET_APP_NAME_ERROR_MESSAGES.EMPTY_APP_NAME)
      };
    }

    const config = workspaceConfig.getConfiguration('prodwatch');
    await config.update('appName', appNameContext.appName, vscode.ConfigurationTarget.Workspace);

    const successMessage = formatSetAppNameSuccessMessage(appNameContext.appName);
    return { success: true, data: successMessage };
  } catch (error) {
    return {
      success: false,
      error: createSetAppNameError(
        error instanceof Error ? error.message : SET_APP_NAME_ERROR_MESSAGES.SAVE_FAILED,
        'setAppNameOperation'
      )
    };
  }
};

/**
 * Get user input for app name
 */
export const getUserAppNameInput = async (
  vscodeProvider: VSCodeProvider
): Promise<Result<SetAppNameContext>> => {
  try {
    const appName = await vscodeProvider.showInputBox(SET_APP_NAME_INPUT_OPTIONS);
    
    if (!appName) {
      return {
        success: false,
        error: createSetAppNameValidationError('App name input was cancelled')
      };
    }

    const context = createSetAppNameContext(appName);
    return { success: true, data: context };
  } catch (error) {
    return {
      success: false,
      error: createSetAppNameError(
        error instanceof Error ? error.message : 'Failed to get user input',
        'getUserAppNameInput'
      )
    };
  }
};

/**
 * Main command execution operation
 */
export const executeSetAppNameCommandOperation = async (
  workspaceConfig: WorkspaceConfigProvider,
  vscodeProvider: VSCodeProvider
): Promise<Result<string>> => {
  // Get user input
  const inputResult = await getUserAppNameInput(vscodeProvider);
  if (!inputResult.success) {
    return inputResult;
  }

  // Execute set app name operation
  const setResult = await setAppNameOperation(workspaceConfig, inputResult.data);
  return setResult;
};