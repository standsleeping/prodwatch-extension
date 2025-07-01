import * as assert from 'assert';
import {
  watchFunctionOperation,
  executeWatchFunctionCommandOperation,
  LoggerProvider
} from '../../../commands/watch-function/watchFunctionOperations';

suite('WatchFunctionOperations', () => {
  // Mock implementations
  const createMockLogger = (): { logger: LoggerProvider; logs: string[] } => {
    const logs: string[] = [];
    const logger: LoggerProvider = {
      log(message: string): void {
        logs.push(message);
      }
    };
    return { logger, logs };
  };

  suite('watchFunctionOperation', () => {
    test('should watch function successfully', () => {
      const { logger, logs } = createMockLogger();
      const watchContext = { functionName: 'testFunc', codeLensPath: 'module.testFunc' };

      const result = watchFunctionOperation(logger, watchContext);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Started watching function: testFunc');
      }
      assert.strictEqual(logs.length, 1);
      assert.ok(logs[0].includes('Watch button clicked for function: testFunc (module.testFunc)'));
    });

    test('should return validation error for invalid context', () => {
      const { logger } = createMockLogger();
      const watchContext = { functionName: '', codeLensPath: 'module.testFunc' };

      const result = watchFunctionOperation(logger, watchContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });

    test('should return validation error for invalid function name', () => {
      const { logger } = createMockLogger();
      const watchContext = { functionName: '123invalid', codeLensPath: 'module.testFunc' };

      const result = watchFunctionOperation(logger, watchContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });

    test('should return validation error for invalid code lens path', () => {
      const { logger } = createMockLogger();
      const watchContext = { functionName: 'testFunc', codeLensPath: 'nomodule' };

      const result = watchFunctionOperation(logger, watchContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });

    test('should handle logger errors gracefully', () => {
      const logger: LoggerProvider = {
        log(): void {
          throw new Error('Logger error');
        }
      };
      const watchContext = { functionName: 'testFunc', codeLensPath: 'module.testFunc' };

      const result = watchFunctionOperation(logger, watchContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Logger error'));
      }
    });
  });

  suite('executeWatchFunctionCommandOperation', () => {
    test('should execute watch function with valid parameters', () => {
      const { logger, logs } = createMockLogger();

      const result = executeWatchFunctionCommandOperation(logger, 'testFunc', 'module.testFunc');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Started watching function: testFunc');
      }
      assert.strictEqual(logs.length, 1);
      assert.ok(logs[0].includes('Watch button clicked for function: testFunc (module.testFunc)'));
    });

    test('should trim function name and code lens path', () => {
      const { logger, logs } = createMockLogger();

      const result = executeWatchFunctionCommandOperation(logger, '  testFunc  ', '  module.testFunc  ');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Started watching function: testFunc');
      }
      assert.strictEqual(logs.length, 1);
      assert.ok(logs[0].includes('Watch button clicked for function: testFunc (module.testFunc)'));
    });

    test('should fail for invalid function name', () => {
      const { logger } = createMockLogger();

      const result = executeWatchFunctionCommandOperation(logger, '123invalid', 'module.testFunc');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });

    test('should fail for invalid code lens path', () => {
      const { logger } = createMockLogger();

      const result = executeWatchFunctionCommandOperation(logger, 'testFunc', 'nomodule');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid watch function context'));
      }
    });
  });
});