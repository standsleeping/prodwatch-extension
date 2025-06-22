import * as vscode from 'vscode';
import Logger from '../utils/logger';

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
    // Later this will load from storage/API.
    // For now, populate with sample data using exact CodeLens strings as keys
    const sampleData: FunctionData[] = [
      {
        codeLensPath: 'src.depgraph.formatters.write_graph_output.write_output',
        dataPoints: [
          'call-1',
          'call-2',
          'call-3',
          'call-4',
          'call-5',
          'call-6',
          'call-7',
        ]
      }
    ];

    // Store in map using the exact CodeLens path as key
    sampleData.forEach(data => {
      this.functionDataMap.set(data.codeLensPath, data);
      Logger.log(`Loaded function data for: ${data.codeLensPath}`);
    });
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
      'No calls found!'
    ];
  }

  // TODO: Add methods for loading from/saving to storage
  // TODO: Add methods for fetching from API
} 