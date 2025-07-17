/**
 * Core types and pure functions for polling functionality
 */

/**
 * Polling configuration types
 */
export interface PollingConfig {
  intervalSeconds: number;
  enabled: boolean;
}

/**
 * Pure validation functions
 */
export const isValidPollingInterval = (intervalSeconds: unknown): intervalSeconds is number => {
  return typeof intervalSeconds === 'number' && 
         intervalSeconds >= 5 && 
         intervalSeconds <= 300 &&
         Number.isInteger(intervalSeconds);
};

export const isValidPollingEnabled = (enabled: unknown): enabled is boolean => {
  return typeof enabled === 'boolean';
};

export const isValidPollingConfig = (config: unknown): config is PollingConfig => {
  if (!config || typeof config !== 'object') {
    return false;
  }
  const pc = config as Partial<PollingConfig>;
  return isValidPollingInterval(pc.intervalSeconds) && isValidPollingEnabled(pc.enabled);
};

/**
 * Pure transformation functions
 */
export const normalizePollingInterval = (intervalSeconds: number): number => {
  return Math.max(5, Math.min(300, Math.floor(intervalSeconds)));
};

export const createPollingConfig = (intervalSeconds: number, enabled: boolean): PollingConfig => ({
  intervalSeconds: normalizePollingInterval(intervalSeconds),
  enabled: !!enabled
});

/**
 * Pure formatting functions
 */
export const formatPollingIntervalDisplay = (intervalSeconds: number): string => {
  if (intervalSeconds < 60) {
    return `${intervalSeconds}s`;
  }
  const minutes = Math.floor(intervalSeconds / 60);
  const remainingSeconds = intervalSeconds % 60;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
};

export const formatPollingStatusMessage = (config: PollingConfig): string => {
  if (!config.enabled) {
    return 'Polling is disabled';
  }
  const interval = formatPollingIntervalDisplay(config.intervalSeconds);
  return `Polling every ${interval}`;
};

/**
 * Pure error handling functions
 */
export const createPollingError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Polling error in ${context}: ${message}` : `Polling error: ${message}`;
  return new Error(fullMessage);
};

export const createPollingValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const isPollingError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Constants
 */
export const DEFAULT_POLLING_INTERVAL_SECONDS = 30; // 30 seconds
export const MIN_POLLING_INTERVAL_SECONDS = 5; // 5 seconds
export const MAX_POLLING_INTERVAL_SECONDS = 300; // 5 minutes

export const POLLING_ERROR_MESSAGES = {
  INVALID_INTERVAL: 'Polling interval must be between 5 and 300 seconds',
  INVALID_ENABLED: 'Polling enabled must be a boolean value',
  INVALID_CONFIG: 'Invalid polling configuration'
} as const;

export const POLLING_SUCCESS_MESSAGES = {
  POLLING_STARTED: 'Polling started successfully',
  POLLING_STOPPED: 'Polling stopped successfully',
  CONFIG_UPDATED: 'Polling configuration updated successfully'
} as const;