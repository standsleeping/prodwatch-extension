import * as assert from 'assert';
import * as vscode from 'vscode';
import { FunctionDataService } from '../data/functionDataService';
import { PythonCodeLensProvider } from '../codeLens/codeLensProvider';
import { WatchStatus } from '../api/apiService';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });

  suite('Extension Integration', () => {
    test('should allow CodeLens provider to be registered with data service', () => {
      // Create mock context
      const mockContext = {
        subscriptions: [],
        workspaceState: {
          get: () => undefined,
          update: () => Promise.resolve()
        },
        globalState: {
          get: () => undefined,
          update: () => Promise.resolve()
        },
        secrets: {
          get: () => Promise.resolve(undefined),
          store: () => Promise.resolve(),
          delete: () => Promise.resolve()
        }
      } as any;

      // Reset singleton for test isolation
      (FunctionDataService as any).instance = undefined;
      
      // Create services as they would be in extension activation
      const functionDataService = FunctionDataService.getInstance(mockContext);
      const codeLensProvider = new PythonCodeLensProvider(functionDataService);
      
      // This should not throw - tests the integration point
      assert.doesNotThrow(() => {
        functionDataService.setCodeLensProvider(codeLensProvider);
      });
      
      // Verify the provider has required methods
      assert.ok(codeLensProvider.onDidChangeCodeLenses);
      assert.ok(typeof codeLensProvider.refresh === 'function');
    });

    test('should maintain CodeLens provider reference after registration', () => {
      const mockContext = {
        subscriptions: [],
        workspaceState: { get: () => undefined, update: () => Promise.resolve() },
        globalState: { get: () => undefined, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(undefined), store: () => Promise.resolve(), delete: () => Promise.resolve() }
      } as any;

      (FunctionDataService as any).instance = undefined;
      
      const functionDataService = FunctionDataService.getInstance(mockContext);
      const codeLensProvider = new PythonCodeLensProvider(functionDataService);
      
      let refreshCalled = false;
      const mockProvider = {
        refresh: () => { refreshCalled = true; }
      };
      
      functionDataService.setCodeLensProvider(mockProvider);
      
      // Simulate data update - should trigger refresh
      const serverResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'test.function': {
            calls: [],
            total_calls: 1,
            watch_status: WatchStatus.NOT_REQUESTED
          }
        }
      };
      
      functionDataService.updateFromServerResponse('test_module', serverResponse);
      
      assert.strictEqual(refreshCalled, true);
    });
  });
});
