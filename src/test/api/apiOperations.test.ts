import { strict as assert } from 'assert';
import {
  loginOperation,
  searchFunctionCallsOperation,
  configureApiOperation,
  Result,
  HttpClient,
  AuthStorage,
  NotificationService
} from '../../api/apiOperations';
import { ApiConfig } from '../../api/apiCore';
import { ServerFunctionResponse } from '../../api/apiService';

// Mock implementations for testing
const createMockHttpClient = (responseOverrides?: Partial<Response>): HttpClient => {
  const defaultResponse: Partial<Response> = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      token: 'test-token',
      user_id: 'test-user',
      email: 'test@example.com'
    })
  };

  return {
    fetch: async () => ({
      ...defaultResponse,
      ...responseOverrides
    } as Response)
  };
};

const createMockAuthStorage = (overrides?: Partial<AuthStorage>): AuthStorage => {
  return {
    storeCredentials: async () => { },
    getToken: async () => 'test-token',
    isAuthenticated: async () => true,
    ...overrides
  };
};

const createMockNotificationService = (): NotificationService & { messages: string[] } => {
  const messages: string[] = [];
  return {
    messages,
    showInfo: (message: string) => messages.push(`INFO: ${message}`),
    showError: (message: string) => messages.push(`ERROR: ${message}`),
    showWarning: (message: string) => messages.push(`WARNING: ${message}`)
  };
};

const defaultConfig: ApiConfig = {
  baseUrl: 'https://test.com'
};

suite('ApiOperations', () => {
  suite('loginOperation', () => {
    test('should successfully login with valid credentials', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: 'testuser', password: 'testpass' }
      );

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, true);
      }
      assert.ok(notifications.messages.some(msg => msg.includes('Login successful')));
    });

    test('should fail with invalid credentials', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: '', password: 'testpass' }
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.validationErrors);
        assert.ok(result.validationErrors.some(err => err.includes('Username')));
      }
    });

    test('should handle HTTP errors gracefully', async () => {
      const httpClient = createMockHttpClient({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: 'testuser', password: 'testpass' }
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Login failed: 401'));
      }
      assert.ok(notifications.messages.some(msg => msg.includes('ERROR')));
    });

    test('should handle invalid JSON response', async () => {
      const httpClient = createMockHttpClient({
        json: async () => { throw new Error('Invalid JSON'); }
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: 'testuser', password: 'testpass' }
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid JSON'));
      }
    });

    test('should handle storage failures', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage({
        storeCredentials: async () => { throw new Error('Storage failed'); }
      });
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: 'testuser', password: 'testpass' }
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to store credentials'));
      }
    });

    test('should handle network errors', async () => {
      const httpClient: HttpClient = {
        fetch: async () => { throw new Error('Network error'); }
      };
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await loginOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        { username: 'testuser', password: 'testpass' }
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Network error'));
      }
    });
  });

  suite('searchFunctionCallsOperation', () => {
    const mockServerResponse: ServerFunctionResponse = {
      function_names: ['func1'],
      total_calls: 5,
      functions: {
        func1: {
          calls: [],
          total_calls: 5
        }
      }
    };

    test('should successfully search function calls', async () => {
      const httpClient = createMockHttpClient({
        json: async () => mockServerResponse
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1', 'func2']
      );

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, mockServerResponse);
      }
    });

    test('should return null when not authenticated', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage({
        isAuthenticated: async () => false
      });
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
    });

    test('should return null when no token available', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage({
        getToken: async () => undefined
      });
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
    });

    test('should handle unauthorized responses gracefully', async () => {
      const httpClient = createMockHttpClient({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
      assert.ok(notifications.messages.some(msg => msg.includes('Authentication expired')));
    });

    test('should fail with invalid function names', async () => {
      const httpClient = createMockHttpClient();
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        [] // Empty array is invalid
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid function names'));
        assert.ok(result.validationErrors);
      }
    });

    test('should handle server errors', async () => {
      const httpClient = createMockHttpClient({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Function call search failed: 500'));
      }
    });

    test('should handle invalid server response format', async () => {
      const httpClient = createMockHttpClient({
        json: async () => ({ invalid: 'response' })
      });
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid server function response'));
      }
    });

    test('should handle network errors', async () => {
      const httpClient: HttpClient = {
        fetch: async () => { throw new Error('Network error'); }
      };
      const authStorage = createMockAuthStorage();
      const notifications = createMockNotificationService();

      const result = await searchFunctionCallsOperation(
        httpClient,
        authStorage,
        notifications,
        defaultConfig,
        ['func1']
      );

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Network error'));
      }
    });
  });

  suite('configureApiOperation', () => {
    test('should successfully configure API with new options', () => {
      const currentConfig: ApiConfig = {
        baseUrl: 'https://old.com'
      };

      const result = configureApiOperation(currentConfig, {
        baseUrl: 'https://new.com'
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, {
          baseUrl: 'https://new.com'
        });
      }
    });

    test('should preserve existing config when no options provided', () => {
      const currentConfig: ApiConfig = {
        baseUrl: 'https://existing.com'
      };

      const result = configureApiOperation(currentConfig, {});

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, {
          baseUrl: 'https://existing.com'
        });
      }
    });

    test('should normalize baseUrl with trimming', () => {
      const currentConfig: ApiConfig = {
        baseUrl: 'https://old.com'
      };

      const result = configureApiOperation(currentConfig, {
        baseUrl: '  https://new.com  '
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.baseUrl, 'https://new.com');
      }
    });
  });
});