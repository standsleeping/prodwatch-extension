// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PythonCodeLensProvider } from './codeLens/codeLensProvider';
import { FunctionHoverProvider } from './hover/functionHoverProvider';
import { FunctionDataService } from './data/functionDataService';
import Logger from './utils/logger';
import { AuthService } from './auth/authService';
import { ApiService } from './api/apiService';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Initialize logger
  Logger.initialize();
  Logger.log('ProdWatch extension activated');

  // Initialize services
  const authService = AuthService.getInstance(context);
  const apiService = ApiService.getInstance(context);
  const functionDataService = FunctionDataService.getInstance(context);

  // Configure API service
  const config = vscode.workspace.getConfiguration('prodwatch');
  const baseUrl = config.get<string>('apiUrl', 'https://getprodwatch.com');
  
  apiService.configure({
    baseUrl: baseUrl
  });

  // Register commands
  const loginCommand = vscode.commands.registerCommand('prodwatch.login', async () => {
    const username = await vscode.window.showInputBox({
      placeHolder: 'Username',
      prompt: 'Enter your username'
    });

    if (!username) return;

    const password = await vscode.window.showInputBox({
      placeHolder: 'Password',
      prompt: 'Enter your password',
      password: true
    });

    if (!password) return;

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging in...',
      cancellable: false
    }, async (progress) => {
      const success = await apiService.login(username, password);

      if (success) {
        vscode.window.showInformationMessage(`Logged in successfully as ${username}`);
      } else {
        vscode.window.showErrorMessage('Login failed. Please check your credentials and try again.');
      }
    });
  });

  // Register commands with extension context
  context.subscriptions.push(
    loginCommand
  );

  // Register the CodeLens provider for Python files
  const codeLensProvider = new PythonCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: 'python', scheme: 'file' },
      codeLensProvider
    )
  );

  // Register the Hover provider for Python files
  const hoverProvider = new FunctionHoverProvider(context, functionDataService);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { language: 'python', scheme: 'file' },
      hoverProvider
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  Logger.log('ProdWatch extension deactivated');
}
