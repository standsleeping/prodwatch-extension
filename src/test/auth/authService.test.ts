import * as assert from 'assert';
import * as vscode from 'vscode';
import { AuthService } from '../../auth/authService';

suite('AuthService', () => {
  let testContext: vscode.ExtensionContext;
  let authService: AuthService;

  suiteSetup(async () => {
    // Create a simple in-memory storage for testing
    const secretStorage = new Map<string, string>();
    const globalStorage = new Map<string, any>();

    testContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: async () => { },
        keys: () => []
      } as vscode.Memento,
      globalState: {
        get: (key: string) => globalStorage.get(key),
        update: async (key: string, value: any) => { globalStorage.set(key, value); },
        keys: () => Array.from(globalStorage.keys()),
        setKeysForSync: () => { }
      } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void },
      secrets: {
        get: async (key: string) => secretStorage.get(key),
        store: async (key: string, value: string) => { secretStorage.set(key, value); },
        delete: async (key: string) => { secretStorage.delete(key); return; },
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
      } as vscode.SecretStorage,
      extensionUri: vscode.Uri.file(__dirname),
      extensionPath: __dirname,
      storagePath: __dirname,
      globalStoragePath: __dirname,
      logPath: __dirname,
      environmentVariableCollection: {} as any,
      asAbsolutePath: (path: string) => path,
      storageUri: undefined,
      globalStorageUri: vscode.Uri.file(__dirname),
      logUri: vscode.Uri.file(__dirname),
      extensionMode: vscode.ExtensionMode.Test,
      extension: {} as any,
      languageModelAccessInformation: {} as any
    };
  });

  setup(() => {
    // Clear singleton for each test
    (AuthService as any).instance = undefined;
    authService = AuthService.getInstance(testContext);
  });

  teardown(async () => {
    // Clean up any stored test data
    try {
      await authService.clearCredentials();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  suite('storeCredentials', () => {
    test('should store valid credentials successfully', async () => {
      const username = 'testuser';
      const token = 'test-token-123';

      await authService.storeCredentials(username, token);

      const storedToken = await authService.getToken();
      const storedUsername = authService.getUsername();

      assert.strictEqual(storedToken, token);
      assert.strictEqual(storedUsername, username);
    });

    test('should reject empty credentials', async () => {
      await assert.rejects(
        authService.storeCredentials('', ''),
        /Invalid credentials/
      );
    });

    test('should handle special characters in credentials', async () => {
      const username = 'user@domain.com';
      const token = 'token-with-special-chars!@#$%^&*()';

      await authService.storeCredentials(username, token);

      const storedToken = await authService.getToken();
      const storedUsername = authService.getUsername();

      assert.strictEqual(storedToken, token);
      assert.strictEqual(storedUsername, username);
    });
  });

  suite('getToken', () => {
    test('should return stored token', async () => {
      await authService.storeCredentials('user', 'test-token');
      const token = await authService.getToken();
      assert.strictEqual(token, 'test-token');
    });

    test('should return undefined when no token stored', async () => {
      const token = await authService.getToken();
      assert.strictEqual(token, undefined);
    });
  });

  suite('getUsername', () => {
    test('should return stored username', async () => {
      await authService.storeCredentials('testuser', 'token');
      const username = authService.getUsername();
      assert.strictEqual(username, 'testuser');
    });

    test('should return undefined when no username stored', () => {
      const username = authService.getUsername();
      assert.strictEqual(username, undefined);
    });
  });

  suite('isAuthenticated', () => {
    test('should return false when not authenticated', async () => {
      assert.strictEqual(await authService.isAuthenticated(), false);
    });

    test('should return true when authenticated', async () => {
      await authService.storeCredentials('user', 'token');
      assert.strictEqual(await authService.isAuthenticated(), true);
    });

    test('should return false after credentials cleared', async () => {
      await authService.storeCredentials('user', 'token');
      await authService.clearCredentials();
      assert.strictEqual(await authService.isAuthenticated(), false);
    });
  });

  suite('clearCredentials', () => {
    test('should clear all stored credentials', async () => {
      await authService.storeCredentials('user', 'token');

      // Verify credentials exist
      assert.strictEqual(await authService.getToken(), 'token');
      assert.strictEqual(authService.getUsername(), 'user');

      await authService.clearCredentials();

      // Verify credentials are cleared
      assert.strictEqual(await authService.getToken(), undefined);
      assert.strictEqual(authService.getUsername(), undefined);
      assert.strictEqual(await authService.isAuthenticated(), false);
    });
  });

  suite('getInstance', () => {
    test('should return same instance for multiple calls', () => {
      const instance1 = AuthService.getInstance(testContext);
      const instance2 = AuthService.getInstance(testContext);

      assert.strictEqual(instance1, instance2);
    });

    test('should maintain state across getInstance calls', async () => {
      const instance1 = AuthService.getInstance(testContext);
      await instance1.storeCredentials('user', 'token');

      const instance2 = AuthService.getInstance(testContext);
      const token = await instance2.getToken();

      assert.strictEqual(token, 'token');
    });
  });
});