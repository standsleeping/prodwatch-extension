import { FunctionCall, FunctionCallData, ServerFunctionResponse, WatchStatus } from '../api/apiService';

/**
 * Core types for function data
 */
export interface FunctionData {
  codeLensPath: string;
  dataPoints: string[];
  callData?: FunctionCallData;
}

export interface FunctionCallArguments {
  args?: unknown[];
  kwargs?: Record<string, unknown>;
}

export interface FunctionCallFormatOptions {
  maxRecentCalls?: number;
  includeExecutionTime?: boolean;
  includeErrors?: boolean;
}

/**
 * Configuration constants
 */
export const DEFAULT_MAX_RECENT_CALLS = 5;
export const DEFAULT_PLACEHOLDER_DATA = ['No function call data available'];

/**
 * Pure validation functions
 */
export const isValidFunctionCall = (call: unknown): call is FunctionCall => {
  if (!call || typeof call !== 'object') {
    return false;
  }
  const fc = call as Partial<FunctionCall>;
  return typeof fc.function_name === 'string' && fc.function_name.length > 0;
};

export const isValidFunctionCallData = (data: unknown): data is FunctionCallData => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const fcd = data as Partial<FunctionCallData>;
  
  const isValidWatchStatus = (status: unknown): boolean => {
    return typeof status === 'string' && 
           Object.values(WatchStatus).includes(status as WatchStatus);
  };
  
  return (
    Array.isArray(fcd.calls) &&
    typeof fcd.total_calls === 'number' &&
    fcd.total_calls >= 0 &&
    fcd.calls.every(call => isValidFunctionCall(call)) &&
    isValidWatchStatus(fcd.watch_status)
  );
};

export const isValidServerResponse = (response: unknown): response is ServerFunctionResponse => {
  if (!response || typeof response !== 'object') {
    return false;
  }
  const sr = response as Partial<ServerFunctionResponse>;

  if (!Array.isArray(sr.function_names)) {
    return false;
  }
  if (typeof sr.total_calls !== 'number' || sr.total_calls < 0) {
    return false;
  }
  if (!sr.functions || typeof sr.functions !== 'object') {
    return false;
  }

  return Object.values(sr.functions).every(data => isValidFunctionCallData(data));
};

export const isValidCodeLensPath = (path: unknown): path is string => {
  return typeof path === 'string' && path.length > 0;
};

/**
 * Pure transformation functions
 */
export const normalizeArguments = (args?: unknown[], kwargs?: Record<string, unknown>): FunctionCallArguments => ({
  args: Array.isArray(args) ? args : undefined,
  kwargs: kwargs && typeof kwargs === 'object' && kwargs !== null ? kwargs : undefined
});

export const createFunctionData = (
  codeLensPath: string, 
  dataPoints: string[], 
  callData?: FunctionCallData
): FunctionData => ({
  codeLensPath,
  dataPoints: [...dataPoints], // Immutable copy
  callData
});

/**
 * Pure formatting functions
 */
export const formatArgumentsString = (args?: unknown[], kwargs?: Record<string, unknown>): string => {
  const normalized = normalizeArguments(args, kwargs);
  const parts: string[] = [];

  // Add positional arguments
  if (normalized.args && normalized.args.length > 0) {
    const argsString = normalized.args.map(arg => {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(', ');
    parts.push(argsString);
  }

  // Add keyword arguments
  if (normalized.kwargs && Object.keys(normalized.kwargs).length > 0) {
    const kwargsString = Object.entries(normalized.kwargs)
      .map(([key, value]) => {
        try {
          return `${key}=${JSON.stringify(value)}`;
        } catch {
          return `${key}=${String(value)}`;
        }
      })
      .join(', ');
    parts.push(kwargsString);
  }

  return parts.join(', ');
};

export const formatFunctionCall = (call: FunctionCall, options: FunctionCallFormatOptions = {}): string => {
  const { includeExecutionTime = true, includeErrors = true } = options;

  const argsString = formatArgumentsString(call.args, call.kwargs);
  let callInfo = `${call.function_name}(${argsString})`;

  if (includeExecutionTime && call.execution_time_ms !== undefined) {
    callInfo += ` — ${call.execution_time_ms.toFixed(1)}ms`;
  }

  if (includeErrors && call.error) {
    callInfo += ` [ERROR: ${call.error}]`;
  }

  return callInfo;
};

export const formatTotalCalls = (totalCalls: number): string => {
  return `Total calls: ${totalCalls}`;
};

export const formatRecentCallsCount = (recentCount: number): string => {
  return `Recent calls tracked: ${recentCount}`;
};

export const formatMoreCallsIndicator = (totalCalls: number, shownCalls: number): string => {
  const moreCalls = totalCalls - shownCalls;
  return `(${moreCalls} more calls)`;
};

/**
 * Pure data conversion functions
 */
export const convertCallsToDataPoints = (
  functionName: string,
  callData: FunctionCallData,
  options: FunctionCallFormatOptions = {}
): string[] => {
  const { maxRecentCalls = DEFAULT_MAX_RECENT_CALLS } = options;
  const dataPoints: string[] = [];

  // Add total calls information
  dataPoints.push(formatTotalCalls(callData.total_calls));

  // Add recent calls count if available
  if (callData.calls && callData.calls.length > 0) {
    dataPoints.push(formatRecentCallsCount(callData.calls.length));

    // Show recent calls
    const callsToShow = callData.calls.slice(0, maxRecentCalls);

    callsToShow.forEach((call, index) => {
      const formattedCall = formatFunctionCall(call, options);
      dataPoints.push(`Call ${index + 1}: ${formattedCall}`);
    });

    // Add "more calls" indicator if needed
    if (callData.calls.length > maxRecentCalls) {
      dataPoints.push(formatMoreCallsIndicator(callData.calls.length, maxRecentCalls));
    }
  }

  return dataPoints;
};

/**
 * Pure error handling functions
 */
export const createValidationError = (message: string, field?: string): Error => {
  const fullMessage = field ? `${field}: ${message}` : message;
  return new Error(fullMessage);
};

export const createFormatError = (message: string, context?: string): Error => {
  const fullMessage = context ? `Format error in ${context}: ${message}` : `Format error: ${message}`;
  return new Error(fullMessage);
};

export const isFormatError = (error: unknown): error is Error => {
  return error instanceof Error && error.message.includes('Format error');
};

export const isValidationError = (error: unknown): error is Error => {
  return error instanceof Error && !error.message.includes('Format error');
};