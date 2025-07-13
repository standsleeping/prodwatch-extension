import * as assert from 'assert';
import {
  loginOperation,
  collectLoginCredentialsOperation,
  executeLoginCommandOperation,
  ApiServiceProvider,
  VSCodeProvider,
  Result
} from '../../../commands/login/loginOperations';

suite('LoginOperations', () => {
  // Mock implementations
  const createMockApiService = (shouldSucceed = true): ApiServiceProvider => ({
    async login(username: string, password: string): Promise<boolean> {
      return shouldSucceed && username === 'validuser' && password === 'validpass';
    }
  });

  const createMockVSCodeProvider = (
    userInputs: (string | undefined)[] = []
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
      async withProgress<R>(options: any, task: any): Promise<R> {
        return task();
      }
    };
  };

  suite('loginOperation', () => {
    test('should return success for valid credentials', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider();
      const loginContext = { username: 'validuser', password: 'validpass' };

      const result = await loginOperation(apiService, vscodeProvider, loginContext);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Logged in successfully as validuser');
      }
    });

    test('should return failure for invalid credentials', async () => {
      const apiService = createMockApiService(false);
      const vscodeProvider = createMockVSCodeProvider();
      const loginContext = { username: 'invaliduser', password: 'invalidpass' };

      const result = await loginOperation(apiService, vscodeProvider, loginContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Login failed'));
      }
    });

    test('should return validation error for invalid context', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider();
      const loginContext = { username: '', password: 'pass' };

      const result = await loginOperation(apiService, vscodeProvider, loginContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid username'));
      }
    });

    test('should handle API service errors', async () => {
      const apiService: ApiServiceProvider = {
        async login(): Promise<boolean> {
          throw new Error('Network error');
        }
      };
      const vscodeProvider = createMockVSCodeProvider();
      const loginContext = { username: 'validuser', password: 'validpass' };

      const result = await loginOperation(apiService, vscodeProvider, loginContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Network error'));
      }
    });
  });

  suite('collectLoginCredentialsOperation', () => {
    test('should collect valid credentials from user input', async () => {
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

    test('should trim whitespace from collected credentials', async () => {
      const vscodeProvider = createMockVSCodeProvider(['  testuser  ', '  testpass  ']);

      const result = await collectLoginCredentialsOperation(vscodeProvider);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { username: 'testuser', password: 'testpass' });
      }
    });
  });

  suite('executeLoginCommandOperation', () => {
    test('should execute complete login flow successfully', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider(['validuser', 'validpass']);

      const result = await executeLoginCommandOperation(apiService, vscodeProvider);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Logged in successfully as validuser');
      }
    });

    test('should fail when credentials collection fails', async () => {
      const apiService = createMockApiService(true);
      const vscodeProvider = createMockVSCodeProvider([undefined]);

      const result = await executeLoginCommandOperation(apiService, vscodeProvider);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Username input cancelled'));
      }
    });

    test('should fail when login operation fails', async () => {
      const apiService = createMockApiService(false);
      const vscodeProvider = createMockVSCodeProvider(['invaliduser', 'invalidpass']);

      const result = await executeLoginCommandOperation(apiService, vscodeProvider);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Login failed'));
      }
    });
  });
});