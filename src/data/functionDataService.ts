import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { ServerFunctionResponse, FunctionCallData } from '../api/apiService';

export interface FunctionData {
  codeLensPath: string; // The exact string that shows in CodeLens
  dataPoints: string[];
}

export class FunctionDataService {
  private static instance: FunctionDataService;
  private functionDataMap: Map<string, FunctionData> = new Map();

  private constructor(private context: vscode.ExtensionContext) {
    this.initializeData();
  }

  public static getInstance(context: vscode.ExtensionContext): FunctionDataService {
    if (!FunctionDataService.instance) {
      FunctionDataService.instance = new FunctionDataService(context);
    }
    return FunctionDataService.instance;
  }

  private initializeData(): void {
    // Initialize empty data map - data will be populated from server responses
    Logger.log('Initialized FunctionDataService with empty data map');
  }

  public getFunctionData(codeLensPath: string): FunctionData | null {
    const data = this.functionDataMap.get(codeLensPath);

    if (data) {
      Logger.log(`Found function data for: ${codeLensPath}`);
      return data;
    }

    Logger.log(`No function data found for: ${codeLensPath}`);
    return null;
  }

  public getDefaultPlaceholderData(): string[] {
    return [
      'No function call data available'
    ];
  }

  /**
   * Convert server function call data to display-friendly data points
   */
  private convertToDataPoints(functionName: string, callData: FunctionCallData): string[] {
    const dataPoints: string[] = [];

    // Add total calls information
    dataPoints.push(`Total calls: ${callData.total_calls}`);

    // Add information about recent calls if available
    if (callData.calls && callData.calls.length > 0) {
      dataPoints.push(`Recent calls tracked: ${callData.calls.length}`);

      // You can add more sophisticated analysis here based on the call data structure
      // For example, if calls have timestamps, you could show:
      // - Most recent call time
      // - Average calls per day
      // - Peak usage times
      // etc.
    }

    // Show actual function calls with their arguments
    if (callData.calls && callData.calls.length > 0) {
      // Show up to 5 most recent calls
      const callsToShow = callData.calls.slice(0, 5);

      callsToShow.forEach((call: any, index: number) => {
        try {
          // Build arguments string from args and kwargs
          let argsString = '';

          // Add positional arguments
          if (call.args && Array.isArray(call.args)) {
            argsString = call.args.join(', ');
          }

          // Add keyword arguments
          if (call.kwargs && Object.keys(call.kwargs).length > 0) {
            const kwargsString = Object.entries(call.kwargs)
              .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
              .join(', ');

            if (argsString) {
              argsString += ', ' + kwargsString;
            } else {
              argsString = kwargsString;
            }
          }

          // Format the call with execution time
          let callInfo = `${call.function_name}(${argsString})`;
          if (call.execution_time_ms) {
            callInfo += ` — ${call.execution_time_ms.toFixed(1)}ms`;
          }

          // Add error info if present
          if (call.error) {
            callInfo += ` [ERROR: ${call.error}]`;
          }

          dataPoints.push(`Call ${index + 1}: ${callInfo}`);
        } catch (error) {
          // If there's an error parsing the call data, show a generic message
          dataPoints.push(`Call ${index + 1}: ${call.function_name || functionName}(...)`);
        }
      });

      // If there are more calls than we're showing, indicate that
      if (callData.calls.length > 5) {
        dataPoints.push(`(${callData.calls.length - 5} more calls)`);
      }
    }

    return dataPoints;
  }

  /**
   * Update function data from server response
   */
  public updateFromServerResponse(modulePath: string, serverResponse: ServerFunctionResponse): void {
    Logger.log(`Updating function data from server: ${serverResponse.function_names.length} functions, ${serverResponse.total_calls} total calls`);

    // Process each function in the response
    Object.entries(serverResponse.functions).forEach(([functionPath, callData]) => {
      // Server returns the exact same key that was sent in the request
      const dataPoints = this.convertToDataPoints(functionPath, callData);

      const functionData: FunctionData = {
        codeLensPath: functionPath,
        dataPoints: dataPoints
      };

      this.functionDataMap.set(functionPath, functionData);
      Logger.log(`Updated function data for: ${functionPath} (${callData.total_calls} calls)`);
    });

    Logger.log(`Function data map now contains ${this.functionDataMap.size} entries`);
  }

  /**
   * Check if we have data for a specific function
   */
  public hasData(codeLensPath: string): boolean {
    return this.functionDataMap.has(codeLensPath);
  }

  /**
   * Get all function paths that currently have data
   */
  public getAllFunctionPaths(): string[] {
    return Array.from(this.functionDataMap.keys());
  }

  /**
   * Clear all stored function data
   */
  public clearAllData(): void {
    this.functionDataMap.clear();
    Logger.log('Cleared all function data');
  }
} 