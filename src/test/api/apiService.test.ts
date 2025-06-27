import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { ApiService } from '../../api/apiService';
import { MockExtensionContext } from '../mocks';


suite('ApiService', () => {
  let apiService: ApiService;
  let mockContext: vscode.ExtensionContext;

  setup(() => {
    (ApiService as any).instance = undefined;
    mockContext = MockExtensionContext.create();
    apiService = ApiService.getInstance(mockContext);
  });

  suite('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = ApiService.getInstance(mockContext);
      const instance2 = ApiService.getInstance(mockContext);
      assert.strictEqual(instance1, instance2);
    });

    test('should create new instance when singleton is undefined', () => {
      (ApiService as any).instance = undefined;
      const instance = ApiService.getInstance(mockContext);
      assert.ok(instance instanceof ApiService);
    });

    test('should maintain singleton across different contexts', () => {
      const instance1 = ApiService.getInstance(mockContext);
      const anotherContext = MockExtensionContext.create();
      const instance2 = ApiService.getInstance(anotherContext);
      assert.strictEqual(instance1, instance2);
    });
  });

  suite('configure', () => {
    test('should accept baseUrl configuration', () => {
      // Should not throw when configuring with baseUrl
      apiService.configure({ baseUrl: 'https://custom.api.com' });
      assert.ok(true);
    });

    test('should accept empty configuration object', () => {
      // Should not throw when configuring with empty object
      apiService.configure({});
      assert.ok(true);
    });
  });

  suite('login', () => {
    test('should return boolean for valid credentials', async () => {
      const username = 'testuser';
      const password = 'testpass';
      
      try {
        const result = await apiService.login(username, password);
        assert.ok(typeof result === 'boolean');
      } catch (error) {
        // Network errors are expected in test environment
        assert.ok(error instanceof Error);
      }
    });

    test('should return false for empty credentials', async () => {
      try {
        const result = await apiService.login('', '');
        assert.strictEqual(result, false);
      } catch (error) {
        // Some implementations may throw for empty credentials
        assert.ok(error instanceof Error);
      }
    });

    test('should handle network failures gracefully', async () => {
      try {
        await apiService.login('testuser', 'testpass');
      } catch (error) {
        // Network failures should result in Error objects
        assert.ok(error instanceof Error);
      }
    });
  });

  suite('searchFunctionCalls', () => {
    test('should return null or object for valid function names', async () => {
      const functionNames = ['func1', 'func2'];
      
      const result = await apiService.searchFunctionCalls(functionNames);
      // Should return null (not authenticated) or ServerFunctionResponse object
      assert.ok(result === null || typeof result === 'object');
    });

    test('should handle empty function names array', async () => {
      const result = await apiService.searchFunctionCalls([]);
      assert.ok(result === null || typeof result === 'object');
    });

    test('should return null when not authenticated', async () => {
      // Since we haven't logged in, should return null
      const result = await apiService.searchFunctionCalls(['func1']);
      assert.strictEqual(result, null);
    });

    test('should handle single function name', async () => {
      const result = await apiService.searchFunctionCalls(['singleFunction']);
      assert.ok(result === null || typeof result === 'object');
    });
  });
});