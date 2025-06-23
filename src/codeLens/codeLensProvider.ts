import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { FunctionDataService } from '../data/functionDataService';

export class PythonCodeLensProvider implements vscode.CodeLensProvider {
  private regex: RegExp;

  constructor(private functionDataService: FunctionDataService) {
    // Match Python function definitions
    this.regex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    Logger.log('PythonCodeLensProvider initialized');
  }

  protected getModulePath(filePath: string): string {
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

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    Logger.log(`Providing CodeLenses for document: ${document.uri.fsPath}`);

    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const modulePath = this.getModulePath(document.uri.fsPath);

    let matches;
    let functionCount = 0;
    while ((matches = this.regex.exec(text)) !== null) {
      functionCount++;
      const line = document.positionAt(matches.index).line;
      const functionName = matches[1];

      Logger.log(`Found function '${functionName}' at line ${line + 1}`);

      const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, matches[0].length)
      );

      // Check if we have function data for this function
      const codeLensPath = `${modulePath}.${functionName}`;
      const functionData = this.functionDataService.getFunctionData(codeLensPath);

      // Only add CodeLens if we have data with calls
      if (functionData) {
        // Extract total calls from the first data point (format: "Total calls: X")
        const totalCallsMatch = functionData.dataPoints[0]?.match(/Total calls: (\d+)/);
        const totalCalls = totalCallsMatch ? parseInt(totalCallsMatch[1]) : 0;

        if (totalCalls > 0) {
          codeLenses.push(new vscode.CodeLens(range, {
            title: `${totalCalls} calls`,
            command: ''
          }));
        }
      }
    }

    Logger.log(`Total functions found: ${functionCount}`);
    return codeLenses;
  }
} 