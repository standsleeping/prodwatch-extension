import * as assert from 'assert';
import { suite, test } from 'mocha';
import {
  // Types
  FunctionData,
  FunctionCallArguments,
  FunctionCallFormatOptions,

  // Constants
  DEFAULT_MAX_RECENT_CALLS,
  DEFAULT_PLACEHOLDER_DATA,

  // Validation functions
  isValidFunctionCall,
  isValidFunctionCallData,
  isValidServerResponse,
  isValidCodeLensPath,

  // Transformation functions
  normalizeArguments,
  createFunctionData,

  // Formatting functions
  formatArgumentsString,
  formatFunctionCall,
  formatTotalCalls,
  formatRecentCallsCount,
  formatMoreCallsIndicator,

  // Conversion functions
  convertCallsToDataPoints,

  // Error functions
  createValidationError,
  createFormatError,
  isFormatError,
  isValidationError
} from '../../data/functionDataCore';
import { FunctionCall, FunctionCallData, ServerFunctionResponse } from '../../api/apiService';

suite('FunctionDataCore', () => {
  suite('isValidFunctionCall', () => {
    test('should return true for valid function call', () => {
      const validCall: FunctionCall = {
        function_name: 'test_function',
        args: [1, 2, 3],
        kwargs: { key: 'value' },
        execution_time_ms: 100
      };

      assert.strictEqual(isValidFunctionCall(validCall), true);
    });

    test('should return true for minimal valid function call', () => {
      const minimalCall: FunctionCall = {
        function_name: 'test'
      };

      assert.strictEqual(isValidFunctionCall(minimalCall), true);
    });

    test('should return false for invalid function calls', () => {
      assert.strictEqual(isValidFunctionCall(null), false);
      assert.strictEqual(isValidFunctionCall(undefined), false);
      assert.strictEqual(isValidFunctionCall('string'), false);
      assert.strictEqual(isValidFunctionCall({}), false);
      assert.strictEqual(isValidFunctionCall({ function_name: '' }), false);
      assert.strictEqual(isValidFunctionCall({ function_name: 123 }), false);
    });
  });

  suite('isValidFunctionCallData', () => {
    test('should return true for valid function call data', () => {
      const validData: FunctionCallData = {
        calls: [{ function_name: 'test' }],
        total_calls: 1
      };

      assert.strictEqual(isValidFunctionCallData(validData), true);
    });

    test('should return true for empty calls array', () => {
      const emptyData: FunctionCallData = {
        calls: [],
        total_calls: 0
      };

      assert.strictEqual(isValidFunctionCallData(emptyData), true);
    });

    test('should return false for invalid function call data', () => {
      assert.strictEqual(isValidFunctionCallData(null), false);
      assert.strictEqual(isValidFunctionCallData({}), false);
      assert.strictEqual(isValidFunctionCallData({ calls: null, total_calls: 0 }), false);
      assert.strictEqual(isValidFunctionCallData({ calls: [], total_calls: -1 }), false);
      assert.strictEqual(isValidFunctionCallData({ calls: [{ invalid: true }], total_calls: 1 }), false);
    });
  });

  suite('isValidServerResponse', () => {
    test('should return true for valid server response', () => {
      const validResponse: ServerFunctionResponse = {
        function_names: ['test_function'],
        total_calls: 1,
        functions: {
          'test_function': {
            calls: [{ function_name: 'test_function' }],
            total_calls: 1
          }
        }
      };

      assert.strictEqual(isValidServerResponse(validResponse), true);
    });

    test('should return false for invalid server response', () => {
      assert.strictEqual(isValidServerResponse(null), false);
      assert.strictEqual(isValidServerResponse({}), false);
      assert.strictEqual(isValidServerResponse({ function_names: null, total_calls: 0, functions: {} }), false);
      assert.strictEqual(isValidServerResponse({ function_names: [], total_calls: -1, functions: {} }), false);
    });
  });

  suite('isValidCodeLensPath', () => {
    test('should return true for valid code lens paths', () => {
      assert.strictEqual(isValidCodeLensPath('module.function'), true);
      assert.strictEqual(isValidCodeLensPath('test'), true);
      assert.strictEqual(isValidCodeLensPath('a.b.c.function_name'), true);
    });

    test('should return false for invalid code lens paths', () => {
      assert.strictEqual(isValidCodeLensPath(''), false);
      assert.strictEqual(isValidCodeLensPath(null), false);
      assert.strictEqual(isValidCodeLensPath(undefined), false);
      assert.strictEqual(isValidCodeLensPath(123), false);
    });
  });

  suite('normalizeArguments', () => {
    test('should normalize valid arguments', () => {
      const result = normalizeArguments([1, 2, 3], { key: 'value' });
      assert.deepStrictEqual(result, {
        args: [1, 2, 3],
        kwargs: { key: 'value' }
      });
    });

    test('should handle undefined arguments', () => {
      const result = normalizeArguments();
      assert.deepStrictEqual(result, {
        args: undefined,
        kwargs: undefined
      });
    });

    test('should handle invalid arguments', () => {
      const result = normalizeArguments('invalid' as any, null as any);
      assert.deepStrictEqual(result, {
        args: undefined,
        kwargs: undefined
      });
    });
  });

  suite('createFunctionData', () => {
    test('should create immutable function data', () => {
      const dataPoints = ['point1', 'point2'];
      const result = createFunctionData('test.function', dataPoints);

      assert.strictEqual(result.codeLensPath, 'test.function');
      assert.deepStrictEqual(result.dataPoints, ['point1', 'point2']);

      // Verify immutability
      dataPoints.push('point3');
      assert.strictEqual(result.dataPoints.length, 2);
    });
  });

  suite('formatArgumentsString', () => {
    test('should format positional arguments', () => {
      const result = formatArgumentsString([1, 'test', true]);
      assert.strictEqual(result, '1, "test", true');
    });

    test('should format keyword arguments', () => {
      const result = formatArgumentsString(undefined, { key1: 'value1', key2: 42 });
      assert.strictEqual(result, 'key1="value1", key2=42');
    });

    test('should format both positional and keyword arguments', () => {
      const result = formatArgumentsString([1, 2], { key: 'value' });
      assert.strictEqual(result, '1, 2, key="value"');
    });

    test('should return empty string for no arguments', () => {
      const result = formatArgumentsString();
      assert.strictEqual(result, '');
    });

    test('should handle non-serializable values gracefully', () => {
      const circular: any = {};
      circular.self = circular;

      const result = formatArgumentsString([circular], { key: circular });
      assert.ok(result.includes('[object Object]'));
    });
  });

  suite('formatFunctionCall', () => {
    test('should format function call with all options', () => {
      const call: FunctionCall = {
        function_name: 'test_func',
        args: [1, 2],
        kwargs: { key: 'value' },
        execution_time_ms: 123.456,
        error: 'Test error'
      };

      const result = formatFunctionCall(call);
      assert.strictEqual(result, 'test_func(1, 2, key="value") — 123.5ms [ERROR: Test error]');
    });

    test('should format function call without execution time', () => {
      const call: FunctionCall = {
        function_name: 'test_func',
        args: [1, 2]
      };

      const result = formatFunctionCall(call, { includeExecutionTime: false });
      assert.strictEqual(result, 'test_func(1, 2)');
    });

    test('should format function call without errors', () => {
      const call: FunctionCall = {
        function_name: 'test_func',
        error: 'Should not show'
      };

      const result = formatFunctionCall(call, { includeErrors: false });
      assert.strictEqual(result, 'test_func()');
    });

    test('should format minimal function call', () => {
      const call: FunctionCall = {
        function_name: 'simple_func'
      };

      const result = formatFunctionCall(call);
      assert.strictEqual(result, 'simple_func()');
    });
  });

  suite('formatTotalCalls', () => {
    test('should format total calls count', () => {
      assert.strictEqual(formatTotalCalls(0), 'Total calls: 0');
      assert.strictEqual(formatTotalCalls(1), 'Total calls: 1');
      assert.strictEqual(formatTotalCalls(100), 'Total calls: 100');
    });
  });

  suite('formatRecentCallsCount', () => {
    test('should format recent calls count', () => {
      assert.strictEqual(formatRecentCallsCount(0), 'Recent calls tracked: 0');
      assert.strictEqual(formatRecentCallsCount(5), 'Recent calls tracked: 5');
      assert.strictEqual(formatRecentCallsCount(10), 'Recent calls tracked: 10');
    });
  });

  suite('formatMoreCallsIndicator', () => {
    test('should format more calls indicator', () => {
      assert.strictEqual(formatMoreCallsIndicator(10, 5), '(5 more calls)');
      assert.strictEqual(formatMoreCallsIndicator(100, 10), '(90 more calls)');
    });
  });

  suite('convertCallsToDataPoints', () => {
    test('should convert function call data to data points', () => {
      const callData: FunctionCallData = {
        calls: [
          {
            function_name: 'test_func',
            args: [1, 2],
            execution_time_ms: 100
          },
          {
            function_name: 'test_func',
            args: [3, 4],
            execution_time_ms: 200,
            error: 'Test error'
          }
        ],
        total_calls: 2
      };

      const result = convertCallsToDataPoints('test_func', callData);

      assert.strictEqual(result.length, 4);
      assert.strictEqual(result[0], 'Total calls: 2');
      assert.strictEqual(result[1], 'Recent calls tracked: 2');
      assert.strictEqual(result[2], 'Call 1: test_func(1, 2) — 100.0ms');
      assert.strictEqual(result[3], 'Call 2: test_func(3, 4) — 200.0ms [ERROR: Test error]');
    });

    test('should handle empty calls array', () => {
      const callData: FunctionCallData = {
        calls: [],
        total_calls: 0
      };

      const result = convertCallsToDataPoints('test_func', callData);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], 'Total calls: 0');
    });

    test('should respect max recent calls limit', () => {
      const calls = Array.from({ length: 10 }, (_, i) => ({
        function_name: 'test_func',
        args: [i]
      }));

      const callData: FunctionCallData = {
        calls,
        total_calls: 10
      };

      const result = convertCallsToDataPoints('test_func', callData, { maxRecentCalls: 3 });

      assert.strictEqual(result.length, 6); // Total + Recent count + 3 calls + More indicator
      assert.strictEqual(result[0], 'Total calls: 10');
      assert.strictEqual(result[1], 'Recent calls tracked: 10');
      assert.strictEqual(result[5], '(7 more calls)');
    });

    test('should handle custom formatting options', () => {
      const callData: FunctionCallData = {
        calls: [{
          function_name: 'test_func',
          execution_time_ms: 100,
          error: 'Test error'
        }],
        total_calls: 1
      };

      const result = convertCallsToDataPoints('test_func', callData, {
        includeExecutionTime: false,
        includeErrors: false
      });

      assert.strictEqual(result[2], 'Call 1: test_func()');
    });
  });

  suite('createValidationError', () => {
    test('should create validation error with message', () => {
      const error = createValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
      assert.ok(error instanceof Error);
    });

    test('should create validation error with field context', () => {
      const error = createValidationError('required', 'username');
      assert.strictEqual(error.message, 'username: required');
    });
  });

  suite('createFormatError', () => {
    test('should create format error with message', () => {
      const error = createFormatError('Invalid format');
      assert.strictEqual(error.message, 'Format error: Invalid format');
    });

    test('should create format error with context', () => {
      const error = createFormatError('Invalid JSON', 'arguments');
      assert.strictEqual(error.message, 'Format error in arguments: Invalid JSON');
    });
  });

  suite('isFormatError', () => {
    test('should identify format errors', () => {
      const formatError = createFormatError('test');
      const validationError = createValidationError('test');
      const regularError = new Error('regular error');

      assert.strictEqual(isFormatError(formatError), true);
      assert.strictEqual(isFormatError(validationError), false);
      assert.strictEqual(isFormatError(regularError), false);
      assert.strictEqual(isFormatError('not an error'), false);
    });
  });

  suite('isValidationError', () => {
    test('should identify validation errors', () => {
      const formatError = createFormatError('test');
      const validationError = createValidationError('test');
      const regularError = new Error('regular error');

      assert.strictEqual(isValidationError(formatError), false);
      assert.strictEqual(isValidationError(validationError), true);
      assert.strictEqual(isValidationError(regularError), true);
      assert.strictEqual(isValidationError('not an error'), false);
    });
  });
});