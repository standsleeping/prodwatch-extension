import * as vscode from 'vscode';
import {
  RefreshDataContext,
  isValidRefreshDataContext,
  createRefreshDataContext,
  formatRefreshDataMessage,
  createRefreshDataError,
  createRefreshDataValidationError,
  REFRESH_DATA_ERROR_MESSAGES
} from './refreshDataCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface abstractions for dependencies
 */
export interface FileFocusServiceProvider {
  fetchDataForActiveFile(): Promise<boolean>;
}

export interface VSCodeProvider {
  showInformationMessage(message: string): Thenable<string | undefined>;
  showErrorMessage(message: string): Thenable<string | undefined>;
  withProgress<R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>): Thenable<R>;
  getActiveTextEditor(): vscode.TextEditor | undefined;
}

/**
 * Pure business logic operations with Result types
 */

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
      error: createRefreshDataValidationError('Invalid refresh data context')
    };
  }

  if (!refreshContext.isActiveEditor || refreshContext.languageId !== 'python') {
    return {
      success: false,
      error: createRefreshDataError(REFRESH_DATA_ERROR_MESSAGES.NOT_PYTHON_FILE, 'refresh data')
    };
  }

  try {
    const fetchSuccess = await fileFocusService.fetchDataForActiveFile();
    if (fetchSuccess) {
      return {
        success: true,
        data: formatRefreshDataMessage()
      };
    } else {
      return {
        success: false,
        error: createRefreshDataError('Failed to fetch function data from server', 'refresh data operation')
      };
    }
  } catch (error) {
    return {
      success: false,
      error: createRefreshDataError(
        error instanceof Error ? error.message : String(error),
        'refresh data operation'
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
      error: createRefreshDataError(
        error instanceof Error ? error.message : String(error),
        'getting editor context'
      )
    };
  }
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