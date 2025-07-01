import * as assert from 'assert';
import {
  isValidFunctionName,
  isValidCodeLensPath,
  isValidWatchFunctionContext,
  createWatchFunctionContext,
  formatWatchFunctionMessage,
  formatWatchFunctionLogMessage,
  createWatchFunctionError,
  createWatchFunctionValidationError,
  isWatchFunctionError,
  isWatchFunctionValidationError,
  WATCH_FUNCTION_COMMAND_NAME,
  WATCH_FUNCTION_ERROR_MESSAGES
} from '../../../commands/watch-function/watchFunctionCore';

suite('WatchFunctionCore', () => {
  suite('isValidFunctionName', () => {
    test('should return true for valid function names', () => {
      assert.strictEqual(isValidFunctionName('my_function'), true);
      assert.strictEqual(isValidFunctionName('myFunction'), true);
      assert.strictEqual(isValidFunctionName('_private_func'), true);
      assert.strictEqual(isValidFunctionName('func123'), true);
    });

    test('should return false for invalid function names', () => {
      assert.strictEqual(isValidFunctionName(''), false);
      assert.strictEqual(isValidFunctionName('123invalid'), false);
      assert.strictEqual(isValidFunctionName('with-dash'), false);
      assert.strictEqual(isValidFunctionName('with space'), false);
      assert.strictEqual(isValidFunctionName(null), false);
      assert.strictEqual(isValidFunctionName(undefined), false);
    });
  });

  suite('isValidCodeLensPath', () => {
    test('should return true for valid code lens paths', () => {
      assert.strictEqual(isValidCodeLensPath('module.function'), true);
      assert.strictEqual(isValidCodeLensPath('package.module.function'), true);
      assert.strictEqual(isValidCodeLensPath('a.b'), true);
    });

    test('should return false for invalid code lens paths', () => {
      assert.strictEqual(isValidCodeLensPath(''), false);
      assert.strictEqual(isValidCodeLensPath('nomodule'), false);
      assert.strictEqual(isValidCodeLensPath(null), false);
      assert.strictEqual(isValidCodeLensPath(undefined), false);
    });
  });

  suite('isValidWatchFunctionContext', () => {
    test('should return true for valid watch function context', () => {
      const context = { functionName: 'myFunc', codeLensPath: 'module.myFunc' };
      assert.strictEqual(isValidWatchFunctionContext(context), true);
    });

    test('should return false for invalid watch function context', () => {
      assert.strictEqual(isValidWatchFunctionContext(null), false);
      assert.strictEqual(isValidWatchFunctionContext({}), false);
      assert.strictEqual(isValidWatchFunctionContext({ functionName: 'func' }), false);
      assert.strictEqual(isValidWatchFunctionContext({ codeLensPath: 'module.func' }), false);
      assert.strictEqual(isValidWatchFunctionContext({ functionName: '123invalid', codeLensPath: 'module.func' }), false);
    });
  });

  suite('createWatchFunctionContext', () => {
    test('should create watch function context with trimmed values', () => {
      const result = createWatchFunctionContext('  myFunc  ', '  module.myFunc  ');
      assert.deepStrictEqual(result, { functionName: 'myFunc', codeLensPath: 'module.myFunc' });
    });
  });

  suite('formatWatchFunctionMessage', () => {
    test('should format watch function message', () => {
      const result = formatWatchFunctionMessage('myFunction');
      assert.strictEqual(result, 'Started watching function: myFunction');
    });
  });

  suite('formatWatchFunctionLogMessage', () => {
    test('should format watch function log message', () => {
      const result = formatWatchFunctionLogMessage('myFunc', 'module.myFunc');
      assert.strictEqual(result, 'Watch button clicked for function: myFunc (module.myFunc)');
    });
  });

  suite('createWatchFunctionError', () => {
    test('should create watch function error with message', () => {
      const error = createWatchFunctionError('Test error');
      assert.strictEqual(error.message, 'Watch function error: Test error');
    });

    test('should create watch function error with context', () => {
      const error = createWatchFunctionError('Test error', 'watch');
      assert.strictEqual(error.message, 'Watch function error in watch: Test error');
    });
  });

  suite('createWatchFunctionValidationError', () => {
    test('should create watch function validation error with message', () => {
      const error = createWatchFunctionValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
    });

    test('should create watch function validation error with field context', () => {
      const error = createWatchFunctionValidationError('Invalid input', 'functionName');
      assert.strictEqual(error.message, 'functionName: Invalid input');
    });
  });

  suite('isWatchFunctionError', () => {
    test('should identify watch function errors', () => {
      const watchFunctionError = createWatchFunctionError('Test');
      const regularError = new Error('Regular error');
      
      assert.strictEqual(isWatchFunctionError(watchFunctionError), true);
      assert.strictEqual(isWatchFunctionError(regularError), false);
      assert.strictEqual(isWatchFunctionError('not an error'), false);
    });
  });

  suite('isWatchFunctionValidationError', () => {
    test('should identify watch function validation errors', () => {
      const validationError = createWatchFunctionValidationError('Test');
      const watchFunctionError = createWatchFunctionError('Test');
      
      assert.strictEqual(isWatchFunctionValidationError(validationError), true);
      assert.strictEqual(isWatchFunctionValidationError(watchFunctionError), false);
      assert.strictEqual(isWatchFunctionValidationError('not an error'), false);
    });
  });

  suite('Constants', () => {
    test('should have correct WATCH_FUNCTION_COMMAND_NAME', () => {
      assert.strictEqual(WATCH_FUNCTION_COMMAND_NAME, 'prodwatch.watchFunction');
    });

    test('should have correct WATCH_FUNCTION_ERROR_MESSAGES', () => {
      assert.strictEqual(WATCH_FUNCTION_ERROR_MESSAGES.WATCH_FUNCTION_FAILED, 'Failed to watch function');
    });
  });
});