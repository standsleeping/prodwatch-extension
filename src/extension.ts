// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PythonCodeLensProvider } from './codeLens/codeLensProvider';
import { FunctionHoverProvider } from './hover/functionHoverProvider';
import { FunctionDataService } from './data/functionDataService';
import { FileFocusService } from './data/fileFocusService';
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

  // Initialize file focus service for automatic data fetching
  const fileFocusService = FileFocusService.getInstance(context, apiService, functionDataService);

  // If there's already an active Python file, fetch data for it
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document.languageId === 'python') {
    fileFocusService.fetchDataForActiveFile().catch(error => {
      Logger.log(`Error fetching data for initial file: ${error}`);
    });
  }

  // Register commands
  const loginCommand = vscode.commands.registerCommand('prodwatch.login', async () => {
    const username = await vscode.window.showInputBox({
      placeHolder: 'Username',
      prompt: 'Enter your username'
    });

    if (!username) {return;}

    const password = await vscode.window.showInputBox({
      placeHolder: 'Password',
      prompt: 'Enter your password',
      password: true
    });

    if (!password) {return;}

    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging in...',
      cancellable: false
    }, async (progress) => {
      const success = await apiService.login(username, password);

      if (success) {
        vscode.window.showInformationMessage(`Logged in successfully as ${username}`);

        // After successful login, fetch data for the current file if it's Python
        if (activeEditor && activeEditor.document.languageId === 'python') {
          fileFocusService.fetchDataForActiveFile().catch(error => {
            Logger.log(`Error fetching data after login: ${error}`);
          });
        }
      } else {
        vscode.window.showErrorMessage('Login failed. Please check your credentials and try again.');
      }
    });
  });

  // Add command to manually refresh function data
  const refreshDataCommand = vscode.commands.registerCommand('prodwatch.refreshData', async () => {
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor && currentEditor.document.languageId === 'python') {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Refreshing function data...',
        cancellable: false
      }, async (progress) => {
        try {
          await fileFocusService.fetchDataForActiveFile();
          vscode.window.showInformationMessage('Function data refreshed successfully');
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to refresh function data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    } else {
      vscode.window.showWarningMessage('Please open a Python file to refresh function data');
    }
  });

  // Register commands with extension context
  context.subscriptions.push(
    loginCommand,
    refreshDataCommand
  );

  // Register the CodeLens provider for Python files
  const codeLensProvider = new PythonCodeLensProvider(functionDataService);
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

  // Dispose of services when extension deactivates
  context.subscriptions.push({
    dispose: () => {
      fileFocusService.dispose();
    }
  });

  Logger.log('ProdWatch extension setup completed');
}

// This method is called when your extension is deactivated
export function deactivate() {
  Logger.log('ProdWatch extension deactivated');
}
