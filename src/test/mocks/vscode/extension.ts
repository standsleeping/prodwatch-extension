import * as vscode from 'vscode';

/**
 * Mock VS Code ExtensionContext for testing
 * Use this for testing extension lifecycle, storage, etc.
 */
export class MockExtensionContext implements vscode.ExtensionContext {
  subscriptions: vscode.Disposable[] = [];

  workspaceState: vscode.Memento;
  globalState: vscode.Memento & { setKeysForSync(keys: readonly string[]): void };

  constructor() {
    const workspaceStorage = new Map<string, any>();
    this.workspaceState = {
      get: <T>(key: string, defaultValue?: T) => workspaceStorage.get(key) ?? defaultValue,
      update: async (key: string, value: any) => { workspaceStorage.set(key, value); },
      keys: () => Array.from(workspaceStorage.keys())
    };

    const globalStorage = new Map<string, any>();
    this.globalState = {
      get: <T>(key: string, defaultValue?: T) => globalStorage.get(key) ?? defaultValue,
      update: async (key: string, value: any) => { globalStorage.set(key, value); },
      keys: () => Array.from(globalStorage.keys()),
      setKeysForSync: () => { }
    };
  }

  secrets: vscode.SecretStorage = MockSecretStorage.create();
  extensionUri: vscode.Uri = vscode.Uri.file('/mock/path');
  extensionPath: string = '/mock/path';
  storageUri: vscode.Uri | undefined = vscode.Uri.file('/mock/storage');
  globalStorageUri: vscode.Uri = vscode.Uri.file('/mock/global/storage');
  logUri: vscode.Uri = vscode.Uri.file('/mock/log');
  environmentVariableCollection: vscode.GlobalEnvironmentVariableCollection = {} as vscode.GlobalEnvironmentVariableCollection;
  storagePath: string | undefined = '/mock/storage';
  globalStoragePath: string = '/mock/global/storage';
  logPath: string = '/mock/log';
  extensionMode: vscode.ExtensionMode = vscode.ExtensionMode.Test;
  extension: vscode.Extension<any> = {} as vscode.Extension<any>;
  languageModelAccessInformation: vscode.LanguageModelAccessInformation = {} as vscode.LanguageModelAccessInformation;

  asAbsolutePath(relativePath: string): string {
    return `/mock/path/${relativePath}`;
  }

  // Helper factory methods
  static create(): MockExtensionContext {
    return new MockExtensionContext();
  }

  static createWithSecrets(secretStorage?: MockSecretStorage): MockExtensionContext {
    const context = new MockExtensionContext();
    context.secrets = secretStorage || MockSecretStorage.create();
    return context;
  }
}

/**
 * Mock VS Code SecretStorage for testing
 * Use this for testing credential storage operations
 */
export class MockSecretStorage implements vscode.SecretStorage {
  private storage = new Map<string, string>();

  async get(key: string): Promise<string | undefined> {
    return this.storage.get(key);
  }

  async store(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  onDidChange: vscode.Event<vscode.SecretStorageChangeEvent> = () => ({ dispose: () => { } });

  // Helper methods for testing
  clear(): void {
    this.storage.clear();
  }

  has(key: string): boolean {
    return this.storage.has(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  // Factory methods
  static create(): MockSecretStorage {
    return new MockSecretStorage();
  }

  static createWithData(initialData: Record<string, string>): MockSecretStorage {
    const storage = new MockSecretStorage();
    Object.entries(initialData).forEach(([key, value]) => {
      storage.storage.set(key, value);
    });
    return storage;
  }
}