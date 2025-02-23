import * as vscode from 'vscode';

export class PythonCodeLensProvider implements vscode.CodeLensProvider {
  private regex: RegExp;

  constructor() {
    // Match Python function definitions
    this.regex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    let matches;
    while ((matches = this.regex.exec(text)) !== null) {
      const line = document.positionAt(matches.index).line;
      const functionName = matches[1];

      const range = new vscode.Range(
        new vscode.Position(line, 0),
        new vscode.Position(line, matches[0].length)
      );

      const moduleName = document.uri.fsPath.split('/').pop()?.replace('.py', '') || '';

      codeLenses.push(new vscode.CodeLens(range, {
        title: `${functionName} in module ${moduleName}`,
        command: ''  // Empty command as we just want to display info
      }));
    }

    return codeLenses;
  }
} 