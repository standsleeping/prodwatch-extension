import * as vscode from 'vscode';

export class PythonCodeLensProvider implements vscode.CodeLensProvider {
  private regex: RegExp;

  constructor() {
    // Match Python function definitions
    this.regex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  }

  private getModulePath(filePath: string): string {
    // Remove file extension
    const pathWithoutExt = filePath.replace(/\.py$/, '');

    // Split path into components
    const parts = pathWithoutExt.split(/[/\\]/); // Handle both Unix and Windows paths

    // Look for common Python project markers
    const rootMarkers = ['src', 'app', 'lib', 'tests'];
    const rootIndex = parts.findIndex(part => rootMarkers.includes(part));

    if (rootIndex === -1) {
      // If no root marker found, just return the filename as module
      return parts[parts.length - 1];
    }

    // Join relevant parts with dots to create Python module path
    return parts.slice(rootIndex).join('.');
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const modulePath = this.getModulePath(document.uri.fsPath);

    let matches;
    while ((matches = this.regex.exec(text)) !== null) {
      const line = document.positionAt(matches.index).line;
      const functionName = matches[1];

      const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, matches[0].length)
      );

      codeLenses.push(new vscode.CodeLens(range, {
        title: `${modulePath}.${functionName}`,
        command: ''
      }));
    }

    return codeLenses;
  }
} 