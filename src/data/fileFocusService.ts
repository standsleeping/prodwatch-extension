import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { ApiService } from '../api/apiService';
import { FunctionDataService } from './functionDataService';

export class FileFocusService {
  private static instance: FileFocusService;
  private functionRegex: RegExp;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    private context: vscode.ExtensionContext,
    private apiService: ApiService,
    private functionDataService: FunctionDataService
  ) {
    // Same regex as CodeLens provider for consistency
    this.functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    this.setupEventListeners();
  }

  public static getInstance(
    context: vscode.ExtensionContext,
    apiService: ApiService,
    functionDataService: FunctionDataService
  ): FileFocusService {
    if (!FileFocusService.instance) {
      FileFocusService.instance = new FileFocusService(context, apiService, functionDataService);
    }
    return FileFocusService.instance;
  }

  private setupEventListeners(): void {
    // Listen for active editor changes (file focus)
    const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        this.handleFileFocus(editor);
      }
    });

    this.disposables.push(onActiveEditorChange);
    Logger.log('FileFocusService: Event listeners setup complete');
  }

  private async handleFileFocus(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;

    // Only process Python files
    if (document.languageId !== 'python') {
      return;
    }

    Logger.log(`File focused: ${document.uri.fsPath}`);

    try {
      // Extract all function definitions from the file with full paths
      const modulePath = this.getModulePath(document.uri.fsPath);
      const functionPaths = this.extractFunctionPaths(document, modulePath);

      if (functionPaths.length === 0) {
        Logger.log('No functions found in file');
        return;
      }

      Logger.log(`Found ${functionPaths.length} functions in ${modulePath}: ${functionPaths.join(', ')}`);

      // Search for function calls using the full paths
      const serverResponse = await this.apiService.searchFunctionCalls(functionPaths);

      if (serverResponse) {
        // Update the function data service with received data
        this.functionDataService.updateFromServerResponse(modulePath, serverResponse);
        Logger.log(`Successfully updated data for ${serverResponse.function_names.length} functions (${serverResponse.total_calls} total calls)`);
      } else {
        Logger.log('No response received from server');
      }
    } catch (error) {
      Logger.log(`Error handling file focus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractFunctionPaths(document: vscode.TextDocument, modulePath: string): string[] {
    const text = document.getText();
    const functionPaths: string[] = [];

    let matches;
    while ((matches = this.functionRegex.exec(text)) !== null) {
      const functionName = matches[1];
      const fullPath = `${modulePath}.${functionName}`;
      functionPaths.push(fullPath);
    }

    // Reset regex lastIndex for next use
    this.functionRegex.lastIndex = 0;

    return functionPaths;
  }

  private getModulePath(filePath: string): string {
    // Use the same logic as CodeLensProvider for consistency
    Logger.log(`Analyzing module path for file: ${filePath}`);

    // Remove file extension
    const pathWithoutExt = filePath.replace(/\.py$/, '');

    // Split path into components
    const parts = pathWithoutExt.split(/[/\\]/); // Handle both Unix and Windows paths
    Logger.log(`Path components: ${parts.join(', ')}`);

    // Look for common Python project markers
    const rootMarkers = ['src', 'app', 'lib', 'tests'];
    const rootIndex = parts.findIndex(part => rootMarkers.includes(part));
    Logger.log(`Root marker found at index: ${rootIndex} (${rootIndex !== -1 ? parts[rootIndex] : 'not found'})`);

    if (rootIndex === -1) {
      // If no root marker found, just return the filename as module
      const moduleName = parts[parts.length - 1];
      Logger.log(`No root marker found, using filename as module: ${moduleName}`);
      return moduleName;
    }

    // Join relevant parts with dots to create Python module path
    const modulePath = parts.slice(rootIndex).join('.');
    Logger.log(`Resolved module path: ${modulePath}`);
    return modulePath;
  }

  /**
   * Manually trigger data fetch for the currently active editor
   */
  public async fetchDataForActiveFile(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      await this.handleFileFocus(activeEditor);
    }
  }

  /**
   * Dispose of event listeners
   */
  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
    Logger.log('FileFocusService disposed');
  }
} 