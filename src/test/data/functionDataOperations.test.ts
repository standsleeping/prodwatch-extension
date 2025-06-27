import * as assert from 'assert';
import { suite, test } from 'mocha';
import {
  Result,
  FunctionDataStorage,
  FunctionDataDependencies,
  getFunctionDataOperation,
  hasFunctionDataOperation,
  getAllFunctionPathsOperation,
  clearAllDataOperation,
  processFunctionCallDataOperation,
  updateFromServerResponseOperation,
  getFunctionDataWithPlaceholderOperation,
  validateServerResponseOperation,
  getStorageStatsOperation
} from '../../data/functionDataOperations';
import { FunctionData, DEFAULT_PLACEHOLDER_DATA } from '../../data/functionDataCore';
import { FunctionCallData, ServerFunctionResponse } from '../../api/apiService';

// Simple in-memory storage implementation for testing
const createMockStorage = (initialData?: Map<string, FunctionData>): FunctionDataStorage => {
  const storage = new Map(initialData);

  return {
    get: (key: string) => storage.get(key),
    set: (key: string, value: FunctionData) => storage.set(key, value),
    has: (key: string) => storage.has(key),
    delete: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
    keys: () => Array.from(storage.keys()),
    size: () => storage.size
  };
};

// Failing storage for error testing
const createFailingStorage = (operation: 'get' | 'set' | 'has' | 'clear' | 'keys' = 'get'): FunctionDataStorage => {
  const storage = createMockStorage();

  return {
    ...storage,
    get: operation === 'get' ? () => { throw new Error('Storage get failed'); } : storage.get,
    set: operation === 'set' ? () => { throw new Error('Storage set failed'); } : storage.set,
    has: operation === 'has' ? () => { throw new Error('Storage has failed'); } : storage.has,
    clear: operation === 'clear' ? () => { throw new Error('Storage clear failed'); } : storage.clear,
    keys: operation === 'keys' ? () => { throw new Error('Storage keys failed'); } : storage.keys
  };
};

suite('FunctionDataOperations', () => {
  suite('getFunctionDataOperation', () => {
    test('should return function data when it exists', () => {
      const testData: FunctionData = {
        codeLensPath: 'test.function',
        dataPoints: ['Total calls: 5']
      };
      const storage = createMockStorage(new Map([['test.function', testData]]));

      const result = getFunctionDataOperation(storage, 'test.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, testData);
      }
    });

    test('should return null when function data does not exist', () => {
      const storage = createMockStorage();

      const result = getFunctionDataOperation(storage, 'nonexistent.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
    });

    test('should return error for invalid code lens path', () => {
      const storage = createMockStorage();

      const result = getFunctionDataOperation(storage, '');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid code lens path'));
      }
    });

    test('should handle storage errors gracefully', () => {
      const storage = createFailingStorage('get');

      const result = getFunctionDataOperation(storage, 'test.function');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Storage get failed'));
      }
    });
  });

  suite('hasFunctionDataOperation', () => {
    test('should return true when function data exists', () => {
      const testData: FunctionData = {
        codeLensPath: 'test.function',
        dataPoints: ['Total calls: 5']
      };
      const storage = createMockStorage(new Map([['test.function', testData]]));

      const result = hasFunctionDataOperation(storage, 'test.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, true);
      }
    });

    test('should return false when function data does not exist', () => {
      const storage = createMockStorage();

      const result = hasFunctionDataOperation(storage, 'nonexistent.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, false);
      }
    });

    test('should return error for invalid code lens path', () => {
      const storage = createMockStorage();

      const result = hasFunctionDataOperation(storage, '');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid code lens path'));
      }
    });

    test('should handle storage errors gracefully', () => {
      const storage = createFailingStorage('has');

      const result = hasFunctionDataOperation(storage, 'test.function');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Storage has failed'));
      }
    });
  });

  suite('getAllFunctionPathsOperation', () => {
    test('should return all function paths', () => {
      const testData = new Map([
        ['func1', { codeLensPath: 'func1', dataPoints: ['data1'] }],
        ['func2', { codeLensPath: 'func2', dataPoints: ['data2'] }]
      ]);
      const storage = createMockStorage(testData);

      const result = getAllFunctionPathsOperation(storage);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data.sort(), ['func1', 'func2']);
      }
    });

    test('should return empty array when no data exists', () => {
      const storage = createMockStorage();

      const result = getAllFunctionPathsOperation(storage);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, []);
      }
    });

    test('should handle storage errors gracefully', () => {
      const storage = createFailingStorage('keys');

      const result = getAllFunctionPathsOperation(storage);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Storage keys failed'));
      }
    });
  });

  suite('clearAllDataOperation', () => {
    test('should clear all function data', () => {
      const testData = new Map([
        ['func1', { codeLensPath: 'func1', dataPoints: ['data1'] }]
      ]);
      const storage = createMockStorage(testData);

      const result = clearAllDataOperation(storage);

      assert.strictEqual(result.success, true);
      assert.strictEqual(storage.size(), 0);
    });

    test('should handle storage errors gracefully', () => {
      const storage = createFailingStorage('clear');

      const result = clearAllDataOperation(storage);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Storage clear failed'));
      }
    });
  });

  suite('processFunctionCallDataOperation', () => {
    test('should process valid function call data', () => {
      const callData: FunctionCallData = {
        calls: [{
          function_name: 'test_func',
          args: [1, 2],
          execution_time_ms: 100
        }],
        total_calls: 1
      };

      const result = processFunctionCallDataOperation('test.function', callData);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.codeLensPath, 'test.function');
        assert.ok(result.data.dataPoints.length > 0);
        assert.strictEqual(result.data.dataPoints[0], 'Total calls: 1');
      }
    });

    test('should return error for invalid function path', () => {
      const callData: FunctionCallData = {
        calls: [],
        total_calls: 0
      };

      const result = processFunctionCallDataOperation('', callData);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid function path'));
      }
    });

    test('should return error for invalid call data', () => {
      const invalidCallData = {
        calls: null,
        total_calls: -1
      } as any;

      const result = processFunctionCallDataOperation('test.function', invalidCallData);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid function call data'));
      }
    });

    test('should use custom formatting options', () => {
      const callData: FunctionCallData = {
        calls: [{
          function_name: 'test_func',
          execution_time_ms: 100,
          error: 'Test error'
        }],
        total_calls: 1
      };

      const result = processFunctionCallDataOperation('test.function', callData, {
        includeExecutionTime: false,
        includeErrors: false
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        const callLine = result.data.dataPoints.find(dp => dp.startsWith('Call 1:'));
        assert.strictEqual(callLine, 'Call 1: test_func()');
      }
    });
  });

  suite('updateFromServerResponseOperation', () => {
    test('should update storage with valid server response', () => {
      const storage = createMockStorage();
      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 2,
        functions: {
          'test.function': {
            calls: [{
              function_name: 'test_func',
              args: [1, 2]
            }],
            total_calls: 1
          },
          'test.other': {
            calls: [],
            total_calls: 1
          }
        }
      };

      const result = updateFromServerResponseOperation(storage, 'test_module', serverResponse);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.updatedCount, 2);
        assert.deepStrictEqual(result.data.functionPaths.sort(), ['test.function', 'test.other']);
      }

      assert.strictEqual(storage.size(), 2);
      assert.ok(storage.has('test.function'));
      assert.ok(storage.has('test.other'));
    });

    test('should return error for invalid module path', () => {
      const storage = createMockStorage();
      const serverResponse: ServerFunctionResponse = {
        function_names: [],
        total_calls: 0,
        functions: {}
      };

      const result = updateFromServerResponseOperation(storage, '', serverResponse);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid module path'));
      }
    });

    test('should return error for invalid server response', () => {
      const storage = createMockStorage();
      const invalidResponse = {
        invalid: true
      } as any;

      const result = updateFromServerResponseOperation(storage, 'test_module', invalidResponse);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid server response'));
      }
    });

    test('should handle partial failures gracefully', () => {
      const storage = createMockStorage();
      const serverResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'valid.function': {
            calls: [],
            total_calls: 0
          },
          '': { // Invalid function path
            calls: [],
            total_calls: 0
          }
        }
      };

      const result = updateFromServerResponseOperation(storage, 'test_module', serverResponse);

      // Should succeed with partial updates
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.updatedCount, 1);
        assert.deepStrictEqual(result.data.functionPaths, ['valid.function']);
      }
    });
  });

  suite('getFunctionDataWithPlaceholderOperation', () => {
    test('should return actual data when it exists', () => {
      const testData: FunctionData = {
        codeLensPath: 'test.function',
        dataPoints: ['Total calls: 5']
      };
      const storage = createMockStorage(new Map([['test.function', testData]]));

      const result = getFunctionDataWithPlaceholderOperation(storage, 'test.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, testData);
      }
    });

    test('should return placeholder data when function data does not exist', () => {
      const storage = createMockStorage();

      const result = getFunctionDataWithPlaceholderOperation(storage, 'nonexistent.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.codeLensPath, 'nonexistent.function');
        assert.deepStrictEqual(result.data.dataPoints, DEFAULT_PLACEHOLDER_DATA);
      }
    });

    test('should return error for invalid code lens path', () => {
      const storage = createMockStorage();

      const result = getFunctionDataWithPlaceholderOperation(storage, '');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid code lens path'));
      }
    });
  });

  suite('validateServerResponseOperation', () => {
    test('should validate correct server response', () => {
      const validResponse: ServerFunctionResponse = {
        function_names: ['test_func'],
        total_calls: 1,
        functions: {
          'test.function': {
            calls: [{
              function_name: 'test_func'
            }],
            total_calls: 1
          }
        }
      };

      const result = validateServerResponseOperation(validResponse);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, validResponse);
      }
    });

    test('should return error for invalid server response', () => {
      const invalidResponse = {
        invalid: true
      };

      const result = validateServerResponseOperation(invalidResponse);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid server response format'));
      }
    });

    test('should return error for null response', () => {
      const result = validateServerResponseOperation(null);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid server response format'));
      }
    });
  });

  suite('getStorageStatsOperation', () => {
    test('should return storage statistics', () => {
      const testData = new Map([
        ['func1', { codeLensPath: 'func1', dataPoints: ['data1'] }],
        ['func2', { codeLensPath: 'func2', dataPoints: ['data2'] }]
      ]);
      const storage = createMockStorage(testData);

      const result = getStorageStatsOperation(storage);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.totalFunctions, 2);
        assert.deepStrictEqual(result.data.functionPaths.sort(), ['func1', 'func2']);
      }
    });

    test('should return empty statistics for empty storage', () => {
      const storage = createMockStorage();

      const result = getStorageStatsOperation(storage);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.totalFunctions, 0);
        assert.deepStrictEqual(result.data.functionPaths, []);
      }
    });

    test('should handle storage errors gracefully', () => {
      const storage = createFailingStorage('keys');

      const result = getStorageStatsOperation(storage);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Storage keys failed'));
      }
    });
  });
});