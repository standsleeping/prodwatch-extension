import * as assert from 'assert';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';
import { FunctionDataService } from '../../data/functionDataService';
import { ServerFunctionResponse } from '../../api/apiService';

// Mock VS Code extension context
const createMockContext = (): vscode.ExtensionContext => {
  return {
    subscriptions: [],
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => []
    },
    globalState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      setKeysForSync: () => { },
      keys: () => []
    },
    extensionPath: '/test/path',
    extensionUri: vscode.Uri.file('/test/path'),
    environmentVariableCollection: {} as any,
    asAbsolutePath: (path: string) => `/test/path/${path}`,
    storageUri: vscode.Uri.file('/test/storage'),
    storagePath: '/test/storage',
    globalStorageUri: vscode.Uri.file('/test/global-storage'),
    globalStoragePath: '/test/global-storage',
    logUri: vscode.Uri.file('/test/log'),
    logPath: '/test/log',
    extensionMode: vscode.ExtensionMode.Test,
    secrets: {} as any,
    extension: {} as any,
    languageModelAccessInformation: {} as any
  };
};

suite('FunctionDataService', () => {
  let context: vscode.ExtensionContext;
  let service: FunctionDataService;

  // Setup test environment
  suiteSetup(() => {
    context = createMockContext();
    service = FunctionDataService.getInstance(context);
  });

  // Reset singleton between tests to ensure isolation
  setup(() => {
    // Reset the singleton instance by accessing private static field
    (FunctionDataService as any).instance = undefined;
    context = createMockContext();
    service = FunctionDataService.getInstance(context);
  });

  test('should create singleton instance', () => {
    const service1 = FunctionDataService.getInstance(context);
    const service2 = FunctionDataService.getInstance(context);

    assert.strictEqual(service1, service2);
  });

  suite('getFunctionData', () => {
    test('should return null for non-existent function data', () => {
      const result = service.getFunctionData('nonexistent.function');

      assert.strictEqual(result, null);
    });

    test('should return null for invalid code lens path', () => {
      const result = service.getFunctionData('');

      assert.strictEqual(result, null);
    });
  });

  suite('getDefaultPlaceholderData', () => {
    test('should return default placeholder data', () => {
      const result = service.getDefaultPlaceholderData();

      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
      assert.strictEqual(result[0], 'No function call data available');
    });

    test('should return immutable copy of placeholder data', () => {
      const result1 = service.getDefaultPlaceholderData();
      const result2 = service.getDefaultPlaceholderData();

      assert.deepStrictEqual(result1, result2);
      assert.notStrictEqual(result1, result2); // Different array instances

      // Modify one result
      result1.push('modified');

      // Other result should be unchanged
      assert.notDeepStrictEqual(result1, result2);
    });
  });

  suite('hasData', () => {
    test('should return false for non-existent function data', () => {
      const result = service.hasData('nonexistent.function');

      assert.strictEqual(result, false);
    });

    test('should return false for invalid code lens path', () => {
      const result = service.hasData('');

      assert.strictEqual(result, false);
    });

    test('should return true after updating function data', () => {

      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'test.function': {
            calls: [{
              function_name: 'test_func',
              args: [1, 2]
            }],
            total_calls: 1
          }
        }
      };

      service.updateFromServerResponse('test_module', serverResponse);

      const result = service.hasData('test.function');
      assert.strictEqual(result, true);
    });
  });

  suite('getAllFunctionPaths', () => {
    test('should return empty array when no data exists', () => {
      const result = service.getAllFunctionPaths();

      assert.deepStrictEqual(result, []);
    });

    test('should return all function paths after updating data', () => {

      const serverResponse: ServerFunctionResponse = {
        function_names: ['func1', 'func2'],
        total_calls: 2,
        functions: {
          'test.func1': {
            calls: [],
            total_calls: 1
          },
          'test.func2': {
            calls: [],
            total_calls: 1
          }
        }
      };

      service.updateFromServerResponse('test_module', serverResponse);

      const result = service.getAllFunctionPaths();
      assert.deepStrictEqual(result.sort(), ['test.func1', 'test.func2']);
    });
  });

  suite('clearAllData', () => {
    test('should clear all function data', () => {

      // Add some data first
      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'test.function': {
            calls: [],
            total_calls: 1
          }
        }
      };

      service.updateFromServerResponse('test_module', serverResponse);
      assert.strictEqual(service.hasData('test.function'), true);

      // Clear all data
      service.clearAllData();

      assert.strictEqual(service.hasData('test.function'), false);
      assert.deepStrictEqual(service.getAllFunctionPaths(), []);
    });
  });

  suite('updateFromServerResponse', () => {
    test('should update function data from valid server response', () => {

      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 2,
        functions: {
          'test.function': {
            calls: [{
              function_name: 'test_func',
              args: [1, 2],
              execution_time_ms: 100
            }],
            total_calls: 1
          },
          'another.function': {
            calls: [{
              function_name: 'another_func',
              kwargs: { key: 'value' },
              error: 'Test error'
            }],
            total_calls: 1
          }
        }
      };

      service.updateFromServerResponse('test_module', serverResponse);

      // Verify data was stored
      assert.strictEqual(service.hasData('test.function'), true);
      assert.strictEqual(service.hasData('another.function'), true);

      const functionData = service.getFunctionData('test.function');
      assert.ok(functionData);
      assert.strictEqual(functionData.codeLensPath, 'test.function');
      assert.ok(functionData.dataPoints.length > 0);

      // Verify formatted content
      assert.ok(functionData.dataPoints.some(dp => dp.includes('Total calls: 1')));
      assert.ok(functionData.dataPoints.some(dp => dp.includes('test_func(1, 2)')));
      assert.ok(functionData.dataPoints.some(dp => dp.includes('100.0ms')));

      const anotherFunctionData = service.getFunctionData('another.function');
      assert.ok(anotherFunctionData);
      assert.ok(anotherFunctionData.dataPoints.some(dp => dp.includes('key="value"')));
      assert.ok(anotherFunctionData.dataPoints.some(dp => dp.includes('[ERROR: Test error]')));
    });

    test('should handle empty server response gracefully', () => {

      const serverResponse: ServerFunctionResponse = {
        function_names: [],
        total_calls: 0,
        functions: {}
      };

      service.updateFromServerResponse('test_module', serverResponse);

      assert.deepStrictEqual(service.getAllFunctionPaths(), []);
    });

    test('should handle server response with empty calls', () => {

      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 0,
        functions: {
          'test.function': {
            calls: [],
            total_calls: 0
          }
        }
      };

      service.updateFromServerResponse('test_module', serverResponse);

      const functionData = service.getFunctionData('test.function');
      assert.ok(functionData);
      assert.ok(functionData.dataPoints.some(dp => dp.includes('Total calls: 0')));
    });

    test('should handle invalid server response gracefully', () => {

      const invalidResponse = {
        invalid: true
      } as any;

      // Should not throw
      service.updateFromServerResponse('test_module', invalidResponse);

      // Should not have added any data
      assert.deepStrictEqual(service.getAllFunctionPaths(), []);
    });

    test('should overwrite existing function data', () => {

      // Add initial data
      const initialResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'test.function': {
            calls: [],
            total_calls: 1
          }
        }
      };

      service.updateFromServerResponse('test_module', initialResponse);
      const initialData = service.getFunctionData('test.function');
      assert.ok(initialData?.dataPoints.some(dp => dp.includes('Total calls: 1')));

      // Update with new data
      const updatedResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 5,
        functions: {
          'test.function': {
            calls: [{
              function_name: 'test_func',
              args: ['new_arg']
            }],
            total_calls: 5
          }
        }
      };

      service.updateFromServerResponse('test_module', updatedResponse);
      const updatedData = service.getFunctionData('test.function');
      assert.ok(updatedData?.dataPoints.some(dp => dp.includes('Total calls: 5')));
      assert.ok(updatedData?.dataPoints.some(dp => dp.includes('"new_arg"')));
    });
  });

  suite('Integration with functional architecture', () => {
    test('should handle complex function call data correctly', () => {

      const complexResponse: ServerFunctionResponse = {
        function_names: ['complex_func'],
        total_calls: 10,
        functions: {
          'module.complex_function': {
            calls: [
              {
                function_name: 'complex_func',
                args: [1, 'string', true, null],
                kwargs: {
                  key1: 'value1',
                  key2: 42,
                  key3: [1, 2, 3],
                  key4: { nested: 'object' }
                },
                execution_time_ms: 123.456,
                timestamp: '2023-01-01T00:00:00Z'
              },
              {
                function_name: 'complex_func',
                args: [],
                error: 'Division by zero',
                execution_time_ms: 50.1
              }
            ],
            total_calls: 10
          }
        }
      };

      service.updateFromServerResponse('test_module', complexResponse);

      const functionData = service.getFunctionData('module.complex_function');
      assert.ok(functionData);

      // Verify complex formatting
      const dataPoints = functionData.dataPoints;
      assert.ok(dataPoints.some(dp => dp.includes('Total calls: 10')));
      assert.ok(dataPoints.some(dp => dp.includes('Recent calls tracked: 2')));

      // Check first call formatting
      const call1 = dataPoints.find(dp => dp.includes('Call 1:'));
      assert.ok(call1);
      assert.ok(call1.includes('1, "string", true, null'));
      assert.ok(call1.includes('key1="value1"'));
      assert.ok(call1.includes('key2=42'));
      assert.ok(call1.includes('123.5ms'));

      // Check second call with error
      const call2 = dataPoints.find(dp => dp.includes('Call 2:'));
      assert.ok(call2);
      assert.ok(call2.includes('[ERROR: Division by zero]'));
      assert.ok(call2.includes('50.1ms'));
    });

    test('should respect maximum recent calls limit', () => {

      // Create response with many calls
      const manyCalls = Array.from({ length: 10 }, (_, i) => ({
        function_name: 'test_func',
        args: [i],
        execution_time_ms: i * 10
      }));

      const response: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 20,
        functions: {
          'test.function': {
            calls: manyCalls,
            total_calls: 20
          }
        }
      };

      service.updateFromServerResponse('test_module', response);

      const functionData = service.getFunctionData('test.function');
      assert.ok(functionData);

      // Should show only default max (5) recent calls plus summary info
      const callLines = functionData.dataPoints.filter(dp => dp.includes('Call '));
      assert.strictEqual(callLines.length, 5); // Only 5 call lines

      // Should show "more calls" indicator
      assert.ok(functionData.dataPoints.some(dp => dp.includes('(5 more calls)')));
    });
  });
});