import * as assert from 'assert';
import {
  PollingConfig,
  isValidPollingInterval,
  isValidPollingEnabled,
  isValidPollingConfig,
  normalizePollingInterval,
  createPollingConfig,
  formatPollingIntervalDisplay,
  formatPollingStatusMessage,
  createPollingError,
  createPollingValidationError,
  isPollingError,
  DEFAULT_POLLING_INTERVAL_SECONDS,
  MIN_POLLING_INTERVAL_SECONDS,
  MAX_POLLING_INTERVAL_SECONDS,
  POLLING_ERROR_MESSAGES,
  POLLING_SUCCESS_MESSAGES
} from '../../polling/pollingCore';

suite('pollingCore', () => {
  
  suite('isValidPollingInterval', () => {
    test('should return true for valid integer seconds', () => {
      assert.strictEqual(isValidPollingInterval(5), true);
      assert.strictEqual(isValidPollingInterval(30), true);
      assert.strictEqual(isValidPollingInterval(300), true);
      assert.strictEqual(isValidPollingInterval(150), true);
    });

    test('should return false for intervals below minimum', () => {
      assert.strictEqual(isValidPollingInterval(4), false);
      assert.strictEqual(isValidPollingInterval(0), false);
      assert.strictEqual(isValidPollingInterval(-1), false);
    });

    test('should return false for intervals above maximum', () => {
      assert.strictEqual(isValidPollingInterval(301), false);
      assert.strictEqual(isValidPollingInterval(1000), false);
    });

    test('should return false for non-integer numbers', () => {
      assert.strictEqual(isValidPollingInterval(5.5), false);
      assert.strictEqual(isValidPollingInterval(29.9), false);
      assert.strictEqual(isValidPollingInterval(30.1), false);
    });

    test('should return false for non-numbers', () => {
      assert.strictEqual(isValidPollingInterval('30'), false);
      assert.strictEqual(isValidPollingInterval(true), false);
      assert.strictEqual(isValidPollingInterval(null), false);
      assert.strictEqual(isValidPollingInterval(undefined), false);
      assert.strictEqual(isValidPollingInterval({}), false);
      assert.strictEqual(isValidPollingInterval([]), false);
    });
  });

  suite('isValidPollingEnabled', () => {
    test('should return true for boolean values', () => {
      assert.strictEqual(isValidPollingEnabled(true), true);
      assert.strictEqual(isValidPollingEnabled(false), true);
    });

    test('should return false for non-boolean values', () => {
      assert.strictEqual(isValidPollingEnabled('true'), false);
      assert.strictEqual(isValidPollingEnabled(1), false);
      assert.strictEqual(isValidPollingEnabled(0), false);
      assert.strictEqual(isValidPollingEnabled(null), false);
      assert.strictEqual(isValidPollingEnabled(undefined), false);
      assert.strictEqual(isValidPollingEnabled({}), false);
      assert.strictEqual(isValidPollingEnabled([]), false);
    });
  });

  suite('isValidPollingConfig', () => {
    test('should return true for valid polling config', () => {
      const validConfig = { intervalSeconds: 30, enabled: true };
      assert.strictEqual(isValidPollingConfig(validConfig), true);
    });

    test('should return true for valid disabled config', () => {
      const validConfig = { intervalSeconds: 60, enabled: false };
      assert.strictEqual(isValidPollingConfig(validConfig), true);
    });

    test('should return false for invalid interval', () => {
      const invalidConfig = { intervalSeconds: 301, enabled: true };
      assert.strictEqual(isValidPollingConfig(invalidConfig), false);
    });

    test('should return false for invalid enabled value', () => {
      const invalidConfig = { intervalSeconds: 30, enabled: 'true' };
      assert.strictEqual(isValidPollingConfig(invalidConfig), false);
    });

    test('should return false for missing properties', () => {
      assert.strictEqual(isValidPollingConfig({ intervalSeconds: 30 }), false);
      assert.strictEqual(isValidPollingConfig({ enabled: true }), false);
      assert.strictEqual(isValidPollingConfig({}), false);
    });

    test('should return false for non-object values', () => {
      assert.strictEqual(isValidPollingConfig(null), false);
      assert.strictEqual(isValidPollingConfig(undefined), false);
      assert.strictEqual(isValidPollingConfig('config'), false);
      assert.strictEqual(isValidPollingConfig(123), false);
      assert.strictEqual(isValidPollingConfig(true), false);
    });
  });

  suite('normalizePollingInterval', () => {
    test('should clamp values to minimum', () => {
      assert.strictEqual(normalizePollingInterval(3), 5);
      assert.strictEqual(normalizePollingInterval(0), 5);
      assert.strictEqual(normalizePollingInterval(-10), 5);
    });

    test('should clamp values to maximum', () => {
      assert.strictEqual(normalizePollingInterval(400), 300);
      assert.strictEqual(normalizePollingInterval(1000), 300);
    });

    test('should floor decimal values', () => {
      assert.strictEqual(normalizePollingInterval(29.9), 29);
      assert.strictEqual(normalizePollingInterval(30.1), 30);
      assert.strictEqual(normalizePollingInterval(5.7), 5);
    });

    test('should return valid values unchanged', () => {
      assert.strictEqual(normalizePollingInterval(5), 5);
      assert.strictEqual(normalizePollingInterval(30), 30);
      assert.strictEqual(normalizePollingInterval(300), 300);
      assert.strictEqual(normalizePollingInterval(150), 150);
    });
  });

  suite('createPollingConfig', () => {
    test('should create valid polling config', () => {
      const config = createPollingConfig(30, true);
      assert.deepStrictEqual(config, { intervalSeconds: 30, enabled: true });
    });

    test('should normalize interval values', () => {
      const config = createPollingConfig(400, true);
      assert.deepStrictEqual(config, { intervalSeconds: 300, enabled: true });
    });

    test('should normalize enabled values', () => {
      const config = createPollingConfig(30, 'true' as any);
      assert.deepStrictEqual(config, { intervalSeconds: 30, enabled: true });
    });

    test('should handle falsy enabled values', () => {
      const config = createPollingConfig(30, false);
      assert.deepStrictEqual(config, { intervalSeconds: 30, enabled: false });
    });
  });

  suite('formatPollingIntervalDisplay', () => {
    test('should format seconds under 60', () => {
      assert.strictEqual(formatPollingIntervalDisplay(5), '5s');
      assert.strictEqual(formatPollingIntervalDisplay(30), '30s');
      assert.strictEqual(formatPollingIntervalDisplay(59), '59s');
    });

    test('should format exact minutes', () => {
      assert.strictEqual(formatPollingIntervalDisplay(60), '1m');
      assert.strictEqual(formatPollingIntervalDisplay(120), '2m');
      assert.strictEqual(formatPollingIntervalDisplay(300), '5m');
    });

    test('should format minutes with remaining seconds', () => {
      assert.strictEqual(formatPollingIntervalDisplay(90), '1m 30s');
      assert.strictEqual(formatPollingIntervalDisplay(125), '2m 5s');
      assert.strictEqual(formatPollingIntervalDisplay(275), '4m 35s');
    });
  });

  suite('formatPollingStatusMessage', () => {
    test('should format disabled polling message', () => {
      const config = { intervalSeconds: 30, enabled: false };
      assert.strictEqual(formatPollingStatusMessage(config), 'Polling is disabled');
    });

    test('should format enabled polling message with seconds', () => {
      const config = { intervalSeconds: 30, enabled: true };
      assert.strictEqual(formatPollingStatusMessage(config), 'Polling every 30s');
    });

    test('should format enabled polling message with minutes', () => {
      const config = { intervalSeconds: 120, enabled: true };
      assert.strictEqual(formatPollingStatusMessage(config), 'Polling every 2m');
    });

    test('should format enabled polling message with mixed time', () => {
      const config = { intervalSeconds: 90, enabled: true };
      assert.strictEqual(formatPollingStatusMessage(config), 'Polling every 1m 30s');
    });
  });

  suite('createPollingError', () => {
    test('should create error with message only', () => {
      const error = createPollingError('Test error');
      assert.strictEqual(error.message, 'Polling error: Test error');
      assert.ok(error instanceof Error);
    });

    test('should create error with context', () => {
      const error = createPollingError('Test error', 'validation');
      assert.strictEqual(error.message, 'Polling error in validation: Test error');
      assert.ok(error instanceof Error);
    });
  });

  suite('createPollingValidationError', () => {
    test('should create validation error with message only', () => {
      const error = createPollingValidationError('Invalid value');
      assert.strictEqual(error.message, 'Invalid value');
      assert.ok(error instanceof Error);
    });

    test('should create validation error with field', () => {
      const error = createPollingValidationError('Invalid value', 'intervalSeconds');
      assert.strictEqual(error.message, 'intervalSeconds: Invalid value');
      assert.ok(error instanceof Error);
    });
  });

  suite('isPollingError', () => {
    test('should return true for Error instances', () => {
      const error = new Error('Test error');
      assert.strictEqual(isPollingError(error), true);
    });

    test('should return false for non-Error values', () => {
      assert.strictEqual(isPollingError('error'), false);
      assert.strictEqual(isPollingError(null), false);
      assert.strictEqual(isPollingError(undefined), false);
      assert.strictEqual(isPollingError({}), false);
      assert.strictEqual(isPollingError(123), false);
    });
  });

  suite('constants', () => {
    test('should have correct default values', () => {
      assert.strictEqual(DEFAULT_POLLING_INTERVAL_SECONDS, 30);
      assert.strictEqual(MIN_POLLING_INTERVAL_SECONDS, 5);
      assert.strictEqual(MAX_POLLING_INTERVAL_SECONDS, 300);
    });

    test('should have error messages', () => {
      assert.ok(POLLING_ERROR_MESSAGES.INVALID_INTERVAL);
      assert.ok(POLLING_ERROR_MESSAGES.INVALID_ENABLED);
      assert.ok(POLLING_ERROR_MESSAGES.INVALID_CONFIG);
    });

    test('should have success messages', () => {
      assert.ok(POLLING_SUCCESS_MESSAGES.POLLING_STARTED);
      assert.ok(POLLING_SUCCESS_MESSAGES.POLLING_STOPPED);
      assert.ok(POLLING_SUCCESS_MESSAGES.CONFIG_UPDATED);
    });
  });
});