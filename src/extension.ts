// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PythonCodeLensProvider } from './codeLens/codeLensProvider';
import Logger from './utils/logger';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize logger
  Logger.initialize();
  Logger.log('ProdWatch extension activated');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('prodwatch.helloWorld', () => {
    Logger.log('Hello World command executed');
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello from prodwatch!');
  });

  context.subscriptions.push(disposable);

  // Register the CodeLens provider for Python files
  const codeLensProvider = new PythonCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'python', scheme: 'file' },
      codeLensProvider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() { }
