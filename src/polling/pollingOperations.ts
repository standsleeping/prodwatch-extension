import * as vscode from 'vscode';
import {
  PollingConfig,
  isValidPollingConfig,
  createPollingConfig,
  createPollingError,
  createPollingValidationError,
  DEFAULT_POLLING_INTERVAL_SECONDS,
  POLLING_ERROR_MESSAGES
} from './pollingCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface abstractions for dependencies
 */
export interface WorkspaceConfigProvider {
  getConfiguration(section: string): vscode.WorkspaceConfiguration;
}

export interface PollingProvider {
  executeRefresh(): Promise<Result<string>>;
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely get polling configuration from workspace settings
 */
export const getPollingConfigOperation = (
  workspaceConfig: WorkspaceConfigProvider
): Result<PollingConfig> => {
  try {
    const config = workspaceConfig.getConfiguration('prodwatch');
    const intervalSeconds = config.get<number>('pollingIntervalSeconds', DEFAULT_POLLING_INTERVAL_SECONDS);
    const enabled = config.get<boolean>('pollingEnabled', false);
    
    const pollingConfig = createPollingConfig(intervalSeconds, enabled);
    
    if (!isValidPollingConfig(pollingConfig)) {
      return {
        success: false,
        error: createPollingValidationError(POLLING_ERROR_MESSAGES.INVALID_CONFIG)
      };
    }
    
    return {
      success: true,
      data: pollingConfig
    };
  } catch (error) {
    return {
      success: false,
      error: createPollingError(
        error instanceof Error ? error.message : 'Failed to get polling configuration',
        'getPollingConfigOperation'
      )
    };
  }
};

/**
 * Safely execute polling refresh operation
 */
export const executePollingRefreshOperation = async (
  pollingProvider: PollingProvider
): Promise<Result<string>> => {
  try {
    const result = await pollingProvider.executeRefresh();
    return result;
  } catch (error) {
    return {
      success: false,
      error: createPollingError(
        error instanceof Error ? error.message : 'Failed to execute polling refresh',
        'executePollingRefreshOperation'
      )
    };
  }
};

/**
 * Safely validate polling configuration for updates
 */
export const validatePollingConfigOperation = (
  intervalSeconds: number,
  enabled: boolean
): Result<PollingConfig> => {
  try {
    const config = createPollingConfig(intervalSeconds, enabled);
    
    if (!isValidPollingConfig(config)) {
      return {
        success: false,
        error: createPollingValidationError(POLLING_ERROR_MESSAGES.INVALID_CONFIG)
      };
    }
    
    return {
      success: true,
      data: config
    };
  } catch (error) {
    return {
      success: false,
      error: createPollingError(
        error instanceof Error ? error.message : 'Failed to validate polling configuration',
        'validatePollingConfigOperation'
      )
    };
  }
};

/**
 * Safely check if polling should be active based on configuration
 */
export const shouldPollingBeActiveOperation = (
  workspaceConfig: WorkspaceConfigProvider
): Result<boolean> => {
  const configResult = getPollingConfigOperation(workspaceConfig);
  
  if (!configResult.success) {
    return {
      success: false,
      error: configResult.error
    };
  }
  
  return {
    success: true,
    data: configResult.data.enabled
  };
};

/**
 * Safely get polling interval in milliseconds for timer operations
 */
export const getPollingIntervalMsOperation = (
  workspaceConfig: WorkspaceConfigProvider
): Result<number> => {
  const configResult = getPollingConfigOperation(workspaceConfig);
  
  if (!configResult.success) {
    return {
      success: false,
      error: configResult.error
    };
  }
  
  return {
    success: true,
    data: configResult.data.intervalSeconds * 1000
  };
};