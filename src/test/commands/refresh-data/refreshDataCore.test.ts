import * as assert from 'assert';
import {
  isValidLanguageId,
  isValidRefreshDataContext,
  createRefreshDataContext,
  formatRefreshDataMessage,
  createRefreshDataError,
  createRefreshDataValidationError,
  isRefreshDataError,
  isRefreshDataValidationError,
  REFRESH_DATA_COMMAND_NAME,
  REFRESH_DATA_ERROR_MESSAGES,
  REFRESH_DATA_SUCCESS_MESSAGES
} from '../../../commands/refresh-data/refreshDataCore';

suite('RefreshDataCore', () => {
  suite('isValidLanguageId', () => {
    test('should return true for any string', () => {
      assert.strictEqual(isValidLanguageId('python'), true);
      assert.strictEqual(isValidLanguageId('javascript'), true);
      assert.strictEqual(isValidLanguageId('typescript'), true);
      assert.strictEqual(isValidLanguageId(''), true);
    });

    test('should return false for non-strings', () => {
      assert.strictEqual(isValidLanguageId(null), false);
      assert.strictEqual(isValidLanguageId(undefined), false);
      assert.strictEqual(isValidLanguageId(123), false);
    });
  });

  suite('isValidRefreshDataContext', () => {
    test('should return true for valid refresh data context', () => {
      const context = { languageId: 'python', isActiveEditor: true };
      assert.strictEqual(isValidRefreshDataContext(context), true);
      
      const context2 = { languageId: 'javascript', isActiveEditor: false };
      assert.strictEqual(isValidRefreshDataContext(context2), true);
    });

    test('should return false for invalid refresh data context', () => {
      assert.strictEqual(isValidRefreshDataContext(null), false);
      assert.strictEqual(isValidRefreshDataContext({}), false);
      assert.strictEqual(isValidRefreshDataContext({ languageId: 'python' }), false);
      assert.strictEqual(isValidRefreshDataContext({ isActiveEditor: true }), false);
    });
  });

  suite('createRefreshDataContext', () => {
    test('should create refresh data context', () => {
      const result = createRefreshDataContext('python', true);
      assert.deepStrictEqual(result, { languageId: 'python', isActiveEditor: true });
    });
  });

  suite('formatRefreshDataMessage', () => {
    test('should format refresh data message', () => {
      const result = formatRefreshDataMessage();
      assert.strictEqual(result, 'Function data refreshed successfully');
    });
  });

  suite('createRefreshDataError', () => {
    test('should create refresh data error with message', () => {
      const error = createRefreshDataError('Test error');
      assert.strictEqual(error.message, 'Test error');
    });

    test('should create refresh data error with context', () => {
      const error = createRefreshDataError('Test error', 'refresh');
      assert.strictEqual(error.message, 'Test error');
    });
  });

  suite('createRefreshDataValidationError', () => {
    test('should create refresh data validation error with message', () => {
      const error = createRefreshDataValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
    });

    test('should create refresh data validation error with field context', () => {
      const error = createRefreshDataValidationError('Invalid input', 'languageId');
      assert.strictEqual(error.message, 'languageId: Invalid input');
    });
  });

  suite('isRefreshDataError', () => {
    test('should identify refresh data errors', () => {
      const refreshDataError = createRefreshDataError('Test');
      const regularError = new Error('Regular error');
      
      assert.strictEqual(isRefreshDataError(refreshDataError), true);
      assert.strictEqual(isRefreshDataError(regularError), true);
      assert.strictEqual(isRefreshDataError('not an error'), false);
    });
  });

  suite('isRefreshDataValidationError', () => {
    test('should identify refresh data validation errors', () => {
      const validationError = createRefreshDataValidationError('Test');
      const refreshDataError = createRefreshDataError('Test');
      
      assert.strictEqual(isRefreshDataValidationError(validationError), true);
      assert.strictEqual(isRefreshDataValidationError(refreshDataError), true);
      assert.strictEqual(isRefreshDataValidationError('not an error'), false);
    });
  });

  suite('Constants', () => {
    test('should have correct REFRESH_DATA_COMMAND_NAME', () => {
      assert.strictEqual(REFRESH_DATA_COMMAND_NAME, 'prodwatch.refreshData');
    });

    test('should have correct REFRESH_DATA_ERROR_MESSAGES', () => {
      assert.strictEqual(REFRESH_DATA_ERROR_MESSAGES.NOT_PYTHON_FILE, 'Please open a Python file to refresh function data');
      assert.strictEqual(REFRESH_DATA_ERROR_MESSAGES.REFRESH_FAILED, 'Failed to refresh function data');
    });

    test('should have correct REFRESH_DATA_SUCCESS_MESSAGES', () => {
      assert.strictEqual(REFRESH_DATA_SUCCESS_MESSAGES.DATA_REFRESHED, 'Function data refreshed successfully');
    });
  });
});