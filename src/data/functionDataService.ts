import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { ServerFunctionResponse } from '../api/apiService';
import { FunctionData, DEFAULT_PLACEHOLDER_DATA } from './functionDataCore';
import {
  FunctionDataStorage,
  updateFromServerResponseOperation,
  getFunctionDataOperation,
  hasFunctionDataOperation,
  getAllFunctionPathsOperation,
  clearAllDataOperation,
  getFunctionDataWithPlaceholderOperation
} from './functionDataOperations';

// Simple Map-based storage implementation
class MapFunctionDataStorage implements FunctionDataStorage {
  private storage = new Map<string, FunctionData>();

  get(codeLensPath: string): FunctionData | undefined {
    return this.storage.get(codeLensPath);
  }

  set(codeLensPath: string, data: FunctionData): void {
    this.storage.set(codeLensPath, data);
  }

  has(codeLensPath: string): boolean {
    return this.storage.has(codeLensPath);
  }

  delete(codeLensPath: string): boolean {
    return this.storage.delete(codeLensPath);
  }

  clear(): void {
    this.storage.clear();
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }

  size(): number {
    return this.storage.size;
  }
}

export class FunctionDataService {
  private static instance: FunctionDataService;
  private storage: FunctionDataStorage;
  private codeLensProvider?: { refresh(): void };

  private constructor(private context: vscode.ExtensionContext) {
    this.storage = new MapFunctionDataStorage();
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

  public setCodeLensProvider(provider: { refresh(): void }): void {
    this.codeLensProvider = provider;
    Logger.log('CodeLens provider registered with FunctionDataService');
  }

  public getFunctionData(codeLensPath: string): FunctionData | null {
    const result = getFunctionDataOperation(this.storage, codeLensPath);

    if (result.success) {
      if (result.data) {
        Logger.log(`Found function data for: ${codeLensPath}`);
        return result.data;
      } else {
        Logger.log(`No function data found for: ${codeLensPath}`);
        return null;
      }
    } else {
      Logger.warn(`Error getting function data for ${codeLensPath}: ${result.error.message}`);
      return null;
    }
  }

  public getDefaultPlaceholderData(): string[] {
    return [...DEFAULT_PLACEHOLDER_DATA];
  }


  /**
   * Update function data from server response
   */
  public updateFromServerResponse(modulePath: string, serverResponse: ServerFunctionResponse): void {
    const functionCount = serverResponse?.function_names?.length || 0;
    const totalCalls = serverResponse?.total_calls || 0;
    Logger.log(`Updating function data from server: ${functionCount} functions, ${totalCalls} total calls`);

    const result = updateFromServerResponseOperation(this.storage, modulePath, serverResponse);

    if (result.success) {
      Logger.log(`Successfully updated ${result.data.updatedCount} functions: ${result.data.functionPaths.join(', ')}`);
      Logger.log(`Function data map now contains ${this.storage.size()} entries`);
      
      // Trigger CodeLens refresh when data updates
      if (this.codeLensProvider) {
        this.codeLensProvider.refresh();
      }
    } else {
      Logger.error(`Failed to update function data from server response: ${result.error.message}`);
    }
  }

  /**
   * Check if we have data for a specific function
   */
  public hasData(codeLensPath: string): boolean {
    const result = hasFunctionDataOperation(this.storage, codeLensPath);

    if (result.success) {
      return result.data;
    } else {
      Logger.warn(`Error checking function data existence for ${codeLensPath}: ${result.error.message}`);
      return false;
    }
  }

  /**
   * Get all function paths that currently have data
   */
  public getAllFunctionPaths(): string[] {
    const result = getAllFunctionPathsOperation(this.storage);

    if (result.success) {
      return result.data;
    } else {
      Logger.warn(`Error getting all function paths: ${result.error.message}`);
      return [];
    }
  }

  /**
   * Clear all stored function data
   */
  public clearAllData(): void {
    const result = clearAllDataOperation(this.storage);

    if (result.success) {
      Logger.log('Cleared all function data');
    } else {
      Logger.error(`Error clearing function data: ${result.error.message}`);
    }
  }
} 