import * as assert from 'assert';
import {
  loginOperation,
  watchFunctionOperation,
  refreshDataOperation,
  collectLoginCredentialsOperation,
  getCurrentEditorContextOperation,
  executeLoginCommandOperation,
  executeRefreshDataCommandOperation,
  executeWatchFunctionCommandOperation,
  ApiServiceProvider,
  FileFocusServiceProvider,
  LoggerProvider,
  VSCodeProvider
} from '../../commands/commandsOperations';

suite('CommandsOperations', () => {
  // Mock implementations
  const createMockApiService = (shouldSucceed = true): ApiServiceProvider => ({
    async login(username: string, password: string): Promise<boolean> {
      return shouldSucceed && username === 'validuser' && password === 'validpass';
    }
  });

  const createMockFileFocusService = (shouldSucceed = true): FileFocusServiceProvider => ({
    async fetchDataForActiveFile(): Promise<void> {
      if (!shouldSucceed) {
        throw new Error('Failed to fetch data');
      }
    }
  });

  const createMockLogger = (): { logger: LoggerProvider; logs: string[] } => {
    const logs: string[] = [];
    const logger: LoggerProvider = {
      log(message: string): void {
        logs.push(message);
      }
    };
    return { logger, logs };
  };

  const createMockVSCodeProvider = (
    userInputs: (string | undefined)[] = [],
    activeEditor?: { document: { languageId: string } }
  ): VSCodeProvider => {
    let inputIndex = 0;
    return {
      async showInputBox(): Promise<string | undefined> {
        return userInputs[inputIndex++];
      },
      async showInformationMessage(): Promise<string | undefined> {
        return undefined;
      },
      async showErrorMessage(): Promise<string | undefined> {
        return undefined;
      },
      async showWarningMessage(): Promise<string | undefined> {
        return undefined;
      },
      async withProgress<R>(options: any, task: any): Promise<R> {
        return task();
      },
      getActiveTextEditor(): any {
        return activeEditor;
      }
    };
  };

  suite('loginOperation', () => {
    test('should successfully login with valid credentials', async () => {
      const apiService = createMockApiService(true);
      const context = { username: 'validuser', password: 'validpass' };
      
      const result = await loginOperation(apiService, context);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Logged in successfully as validuser');
      }
    });

    test('should fail with invalid credentials', async () => {
      const apiService = createMockApiService(true);
      const context = { username: 'invaliduser', password: 'invalidpass' };
      
      const result = await loginOperation(apiService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Login failed'));
      }
    });

    test('should return error for invalid context', async () => {
      const apiService = createMockApiService(true);
      const context = { username: '', password: 'pass' } as any;
      
      const result = await loginOperation(apiService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid username or password'));
      }
    });

    test('should handle API service errors', async () => {
      const apiService: ApiServiceProvider = {
        async login(): Promise<boolean> {
          throw new Error('Network error');
        }
      };
      const context = { username: 'user', password: 'pass' };
      
      const result = await loginOperation(apiService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Network error'));
      }
    });
  });

  suite('watchFunctionOperation', () => {
    test('should successfully watch function', () => {
      const { logger, logs } = createMockLogger();
      const context = { functionName: 'myFunc', codeLensPath: 'module.myFunc' };
      
      const result = watchFunctionOperation(logger, context);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Started watching function: myFunc');
        assert.strictEqual(logs.length, 1);
        assert.ok(logs[0].includes('Watch button clicked for function: myFunc (module.myFunc)'));
      }
    });

    test('should return error for invalid context', () => {
      const { logger } = createMockLogger();
      const context = { functionName: '123invalid', codeLensPath: 'module.func' } as any;
      
      const result = watchFunctionOperation(logger, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });
  });

  suite('refreshDataOperation', () => {
    test('should successfully refresh data for Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const context = { languageId: 'python', isActiveEditor: true };
      
      const result = await refreshDataOperation(fileFocusService, context);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Function data refreshed successfully');
      }
    });

    test('should return error for non-Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const context = { languageId: 'javascript', isActiveEditor: true };
      
      const result = await refreshDataOperation(fileFocusService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Command error in refresh data: Please open a Python file'));
      }
    });

    test('should return error when no active editor', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const context = { languageId: 'python', isActiveEditor: false };
      
      const result = await refreshDataOperation(fileFocusService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Command error in refresh data: Please open a Python file'));
      }
    });

    test('should handle file focus service errors', async () => {
      const fileFocusService = createMockFileFocusService(false);
      const context = { languageId: 'python', isActiveEditor: true };
      
      const result = await refreshDataOperation(fileFocusService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to fetch data'));
      }
    });

    test('should return error for invalid context', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const context = { languageId: 'python' } as any; // Missing isActiveEditor
      
      const result = await refreshDataOperation(fileFocusService, context);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid refresh data context'));
      }
    });
  });

  suite('collectLoginCredentialsOperation', () => {
    test('should collect valid credentials', async () => {
      const vscodeProvider = createMockVSCodeProvider(['testuser', 'testpass']);
      
      const result = await collectLoginCredentialsOperation(vscodeProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { username: 'testuser', password: 'testpass' });
      }
    });

    test('should handle cancelled username input', async () => {
      const vscodeProvider = createMockVSCodeProvider([undefined]);
      
      const result = await collectLoginCredentialsOperation(vscodeProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Username input cancelled'));
      }
    });

    test('should handle cancelled password input', async () => {
      const vscodeProvider = createMockVSCodeProvider(['testuser', undefined]);
      
      const result = await collectLoginCredentialsOperation(vscodeProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Password input cancelled'));
      }
    });
  });

  suite('getCurrentEditorContextOperation', () => {
    test('should get context for Python editor', () => {
      const vscodeProvider = createMockVSCodeProvider([], { document: { languageId: 'python' } });
      
      const result = getCurrentEditorContextOperation(vscodeProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { languageId: 'python', isActiveEditor: true });
      }
    });

    test('should get context when no active editor', () => {
      const vscodeProvider = createMockVSCodeProvider([]);
      
      const result = getCurrentEditorContextOperation(vscodeProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { languageId: '', isActiveEditor: false });
      }
    });
  });

  suite('executeLoginCommandOperation', () => {
    test('should execute complete login command successfully', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider(['validuser', 'validpass']);
      
      const result = await executeLoginCommandOperation(apiService, vscodeProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Logged in successfully as validuser');
      }
    });

    test('should handle credential collection failure', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider([undefined]);
      
      const result = await executeLoginCommandOperation(apiService, vscodeProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Username input cancelled'));
      }
    });
  });

  suite('executeRefreshDataCommandOperation', () => {
    test('should execute complete refresh command successfully', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider([], { document: { languageId: 'python' } });
      
      const result = await executeRefreshDataCommandOperation(fileFocusService, vscodeProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Function data refreshed successfully');
      }
    });

    test('should handle non-Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider([], { document: { languageId: 'javascript' } });
      
      const result = await executeRefreshDataCommandOperation(fileFocusService, vscodeProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Command error in refresh data: Please open a Python file'));
      }
    });
  });

  suite('executeWatchFunctionCommandOperation', () => {
    test('should execute watch function command successfully', () => {
      const { logger } = createMockLogger();
      
      const result = executeWatchFunctionCommandOperation(logger, 'myFunc', 'module.myFunc');
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Started watching function: myFunc');
      }
    });

    test('should handle invalid function name', () => {
      const { logger } = createMockLogger();
      
      const result = executeWatchFunctionCommandOperation(logger, '123invalid', 'module.func');
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });
  });
});