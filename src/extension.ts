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
import { CommandsService } from './commands/commandsService';
import { PollingService } from './polling/pollingService';
import { createRefreshDataPollingProvider } from './polling/pollingProvider';

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

  // Initialize commands service and register commands
  const commandsService = CommandsService.getInstance(context, apiService, fileFocusService);
  const commandDisposables = commandsService.registerCommands();
  
  // Register commands with extension context
  context.subscriptions.push(...commandDisposables);

  // Initialize polling service
  const workspaceConfigProvider = {
    getConfiguration: (section: string) => vscode.workspace.getConfiguration(section)
  };
  const vscodeProvider = {
    showInformationMessage: (message: string) => vscode.window.showInformationMessage(message),
    showErrorMessage: (message: string) => vscode.window.showErrorMessage(message),
    withProgress: <R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>) => 
      vscode.window.withProgress(options, task),
    getActiveTextEditor: () => vscode.window.activeTextEditor
  };
  const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
  const pollingService = PollingService.getInstance(workspaceConfigProvider, pollingProvider);
  
  // Start polling based on configuration
  pollingService.startPolling();

  // Handle configuration changes for polling
  const configurationChangeDisposable = vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('prodwatch.pollingEnabled') || 
        event.affectsConfiguration('prodwatch.pollingIntervalSeconds')) {
      Logger.log('Polling configuration changed, restarting polling service');
      pollingService.restartPolling();
    }
  });
  context.subscriptions.push(configurationChangeDisposable);

  // Register the CodeLens provider for Python files
  const codeLensProvider = new PythonCodeLensProvider(functionDataService);
  functionDataService.setCodeLensProvider(codeLensProvider);
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
      pollingService.stopPolling();
      fileFocusService.dispose();
    }
  });

  Logger.log('ProdWatch extension setup completed');
}

// This method is called when your extension is deactivated
export function deactivate() {
  Logger.log('ProdWatch extension deactivated');
  Logger.dispose();
}
