import {
  WatchFunctionContext,
  isValidWatchFunctionContext,
  createWatchFunctionContext,
  formatWatchFunctionMessage,
  formatWatchFunctionLogMessage,
  createWatchFunctionError,
  createWatchFunctionValidationError
} from './watchFunctionCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface abstractions for dependencies
 */
export interface LoggerProvider {
  log(message: string): void;
}

export interface ApiServiceProvider {
  requestWatch(functionNames: string[]): Promise<boolean>;
}

/**
 * Pure business logic operations with Result types
 */

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
      error: createWatchFunctionValidationError('Invalid watch function context')
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
      error: createWatchFunctionError(
        error instanceof Error ? error.message : String(error),
        'watch function operation'
      )
    };
  }
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