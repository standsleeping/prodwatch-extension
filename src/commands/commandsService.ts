import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { ApiService } from '../api/apiService';
import { FileFocusService } from '../data/fileFocusService';

// Login command imports
import { 
  executeLoginCommandOperation,
  ApiServiceProvider as LoginApiServiceProvider,
  VSCodeProvider as LoginVSCodeProvider,
  FileFocusServiceProvider as LoginFileFocusServiceProvider,
  LoggerProvider as LoginLoggerProvider
} from './login/loginOperations';
import { LOGIN_COMMAND_NAME } from './login/loginCore';

// Refresh data command imports
import {
  executeRefreshDataCommandOperation,
  FileFocusServiceProvider as RefreshDataFileFocusServiceProvider,
  VSCodeProvider as RefreshDataVSCodeProvider
} from './refresh-data/refreshDataOperations';
import { REFRESH_DATA_COMMAND_NAME } from './refresh-data/refreshDataCore';

// Watch function command imports
import {
  executeWatchFunctionCommandOperation,
  LoggerProvider as WatchFunctionLoggerProvider,
  ApiServiceProvider as WatchFunctionApiServiceProvider
} from './watch-function/watchFunctionOperations';
import { WATCH_FUNCTION_COMMAND_NAME } from './watch-function/watchFunctionCore';

// Set app name command imports
import {
  executeSetAppNameCommandOperation,
  VSCodeProvider as SetAppNameVSCodeProvider,
  WorkspaceConfigProvider as SetAppNameWorkspaceConfigProvider
} from './set-app-name/setAppNameOperations';
import { SET_APP_NAME_COMMAND_NAME } from './set-app-name/setAppNameCore';

// VS Code provider implementation (implements all command VSCode interfaces)
class VSCodeProviderImpl implements LoginVSCodeProvider, RefreshDataVSCodeProvider, SetAppNameVSCodeProvider {
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

// Logger provider implementation (implements all command logger interfaces)
class LoggerProviderImpl implements LoginLoggerProvider, WatchFunctionLoggerProvider {
  log(message: string): void {
    Logger.log(message);
  }
}

// API service adapter (implements all command API service interfaces)
class ApiServiceAdapter implements LoginApiServiceProvider, WatchFunctionApiServiceProvider {
  constructor(private apiService: ApiService) {}

  async login(username: string, password: string): Promise<boolean> {
    return this.apiService.login(username, password);
  }

  async requestWatch(functionNames: string[]): Promise<boolean> {
    return this.apiService.requestWatch(functionNames);
  }
}

// File focus service adapter (implements all command file focus service interfaces)
class FileFocusServiceAdapter implements LoginFileFocusServiceProvider, RefreshDataFileFocusServiceProvider {
  constructor(private fileFocusService: FileFocusService) {}

  async fetchDataForActiveFile(): Promise<boolean> {
    return await this.fileFocusService.fetchDataForActiveFile();
  }
}

// Workspace config provider implementation
class WorkspaceConfigProviderImpl implements SetAppNameWorkspaceConfigProvider {
  getConfiguration(section: string): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(section);
  }
}

export class CommandsService {
  private static instance: CommandsService;
  private vscodeProvider: VSCodeProviderImpl;
  private loggerProvider: LoggerProviderImpl;
  private apiServiceProvider: ApiServiceAdapter;
  private fileFocusServiceProvider: FileFocusServiceAdapter;
  private workspaceConfigProvider: WorkspaceConfigProviderImpl;

  private constructor(
    private context: vscode.ExtensionContext,
    apiService: ApiService,
    fileFocusService: FileFocusService
  ) {
    this.vscodeProvider = new VSCodeProviderImpl();
    this.loggerProvider = new LoggerProviderImpl();
    this.apiServiceProvider = new ApiServiceAdapter(apiService);
    this.fileFocusServiceProvider = new FileFocusServiceAdapter(fileFocusService);
    this.workspaceConfigProvider = new WorkspaceConfigProviderImpl();
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
      LOGIN_COMMAND_NAME,
      () => this.executeLoginCommand()
    );

    const refreshDataCommand = vscode.commands.registerCommand(
      REFRESH_DATA_COMMAND_NAME,
      () => this.executeRefreshDataCommand()
    );

    const watchFunctionCommand = vscode.commands.registerCommand(
      WATCH_FUNCTION_COMMAND_NAME,
      (functionName: string, codeLensPath: string) => 
        this.executeWatchFunctionCommand(functionName, codeLensPath)
    );

    const setAppNameCommand = vscode.commands.registerCommand(
      SET_APP_NAME_COMMAND_NAME,
      () => this.executeSetAppNameCommand()
    );

    return [loginCommand, refreshDataCommand, watchFunctionCommand, setAppNameCommand];
  }

  /**
   * Execute login command
   */
  private async executeLoginCommand(): Promise<void> {
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
  }

  /**
   * Execute refresh data command with progress indication
   */
  private async executeRefreshDataCommand(): Promise<void> {
    const result = await this.vscodeProvider.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Refreshing function data...',
      cancellable: false
    }, async () => {
      return await executeRefreshDataCommandOperation(
        this.fileFocusServiceProvider,
        this.vscodeProvider
      );
    });

    if (result.success) {
      await this.vscodeProvider.showInformationMessage(result.data);
    } else {
      await this.vscodeProvider.showErrorMessage(result.error.message);
    }
  }

  /**
   * Execute watch function command
   */
  private async executeWatchFunctionCommand(functionName: string, codeLensPath: string): Promise<void> {
    // Validate the watch function context first (pure function validation)
    const result = executeWatchFunctionCommandOperation(
      this.loggerProvider,
      functionName,
      codeLensPath
    );

    if (!result.success) {
      await this.vscodeProvider.showErrorMessage(result.error.message);
      return;
    }

    // Call the API service to actually request the watch (imperative shell)
    const watchSuccess = await this.apiServiceProvider.requestWatch([functionName]);
    
    if (!watchSuccess) {
      // Error messages already shown by API service
      return;
    }

    // Additional success handling could go here if needed
  }

  /**
   * Execute set app name command
   */
  private async executeSetAppNameCommand(): Promise<void> {
    const result = await executeSetAppNameCommandOperation(
      this.workspaceConfigProvider,
      this.vscodeProvider
    );

    if (result.success) {
      await this.vscodeProvider.showInformationMessage(result.data);
    } else {
      await this.vscodeProvider.showErrorMessage(result.error.message);
    }
  }
}