import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { ApiService } from '../api/apiService';
import { FileFocusService } from '../data/fileFocusService';
import {
  executeLoginCommandOperation,
  executeRefreshDataCommandOperation,
  executeWatchFunctionCommandOperation,
  ApiServiceProvider,
  FileFocusServiceProvider,
  LoggerProvider,
  VSCodeProvider
} from './commandsOperations';
import { COMMAND_NAMES } from './commandsCore';

// VS Code provider implementation
class VSCodeProviderImpl implements VSCodeProvider {
  showInputBox(options: vscode.InputBoxOptions): Thenable<string | undefined> {
    return vscode.window.showInputBox(options);
  }

  showInformationMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message);
  }

  showErrorMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message);
  }

  showWarningMessage(message: string): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message);
  }

  withProgress<R>(
    options: vscode.ProgressOptions,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Thenable<R>
  ): Thenable<R> {
    return vscode.window.withProgress(options, task);
  }

  getActiveTextEditor(): vscode.TextEditor | undefined {
    return vscode.window.activeTextEditor;
  }
}

// Logger provider implementation
class LoggerProviderImpl implements LoggerProvider {
  log(message: string): void {
    Logger.log(message);
  }
}

// API service adapter
class ApiServiceAdapter implements ApiServiceProvider {
  constructor(private apiService: ApiService) {}

  async login(username: string, password: string): Promise<boolean> {
    return this.apiService.login(username, password);
  }
}

// File focus service adapter
class FileFocusServiceAdapter implements FileFocusServiceProvider {
  constructor(private fileFocusService: FileFocusService) {}

  async fetchDataForActiveFile(): Promise<void> {
    return this.fileFocusService.fetchDataForActiveFile();
  }
}

export class CommandsService {
  private static instance: CommandsService;
  private vscodeProvider: VSCodeProvider;
  private loggerProvider: LoggerProvider;
  private apiServiceProvider: ApiServiceProvider;
  private fileFocusServiceProvider: FileFocusServiceProvider;

  private constructor(
    private context: vscode.ExtensionContext,
    apiService: ApiService,
    fileFocusService: FileFocusService
  ) {
    this.vscodeProvider = new VSCodeProviderImpl();
    this.loggerProvider = new LoggerProviderImpl();
    this.apiServiceProvider = new ApiServiceAdapter(apiService);
    this.fileFocusServiceProvider = new FileFocusServiceAdapter(fileFocusService);
  }

  public static getInstance(
    context: vscode.ExtensionContext,
    apiService: ApiService,
    fileFocusService: FileFocusService
  ): CommandsService {
    if (!CommandsService.instance) {
      CommandsService.instance = new CommandsService(context, apiService, fileFocusService);
    }
    return CommandsService.instance;
  }

  /**
   * Register all commands with VS Code
   */
  public registerCommands(): vscode.Disposable[] {
    const loginCommand = vscode.commands.registerCommand(
      COMMAND_NAMES.LOGIN,
      () => this.executeLoginCommand()
    );

    const refreshDataCommand = vscode.commands.registerCommand(
      COMMAND_NAMES.REFRESH_DATA,
      () => this.executeRefreshDataCommand()
    );

    const watchFunctionCommand = vscode.commands.registerCommand(
      COMMAND_NAMES.WATCH_FUNCTION,
      (functionName: string, codeLensPath: string) => 
        this.executeWatchFunctionCommand(functionName, codeLensPath)
    );

    return [loginCommand, refreshDataCommand, watchFunctionCommand];
  }

  /**
   * Execute login command with progress indication
   */
  private async executeLoginCommand(): Promise<void> {
    await this.vscodeProvider.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging in...',
      cancellable: false
    }, async () => {
      const result = await executeLoginCommandOperation(
        this.apiServiceProvider,
        this.vscodeProvider
      );

      if (result.success) {
        await this.vscodeProvider.showInformationMessage(result.data);
        
        // After successful login, fetch data for the current file if it's Python
        const activeEditor = this.vscodeProvider.getActiveTextEditor();
        if (activeEditor && activeEditor.document.languageId === 'python') {
          try {
            await this.fileFocusServiceProvider.fetchDataForActiveFile();
          } catch (error) {
            Logger.log(`Error fetching data after login: ${error}`);
          }
        }
      } else {
        await this.vscodeProvider.showErrorMessage(result.error.message);
      }
    });
  }

  /**
   * Execute refresh data command with progress indication
   */
  private async executeRefreshDataCommand(): Promise<void> {
    await this.vscodeProvider.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Refreshing function data...',
      cancellable: false
    }, async () => {
      const result = await executeRefreshDataCommandOperation(
        this.fileFocusServiceProvider,
        this.vscodeProvider
      );

      if (result.success) {
        await this.vscodeProvider.showInformationMessage(result.data);
      } else {
        await this.vscodeProvider.showErrorMessage(result.error.message);
      }
    });
  }

  /**
   * Execute watch function command
   */
  private async executeWatchFunctionCommand(functionName: string, codeLensPath: string): Promise<void> {
    const result = executeWatchFunctionCommandOperation(
      this.loggerProvider,
      functionName,
      codeLensPath
    );

    if (result.success) {
      await this.vscodeProvider.showInformationMessage(result.data);
    } else {
      await this.vscodeProvider.showErrorMessage(result.error.message);
    }
  }
}