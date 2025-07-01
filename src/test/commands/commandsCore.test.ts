import * as assert from 'assert';
import {
  isValidUsername,
  isValidPassword,
  isValidFunctionName,
  isValidCodeLensPath,
  isValidLanguageId,
  isValidLoginContext,
  isValidWatchFunctionContext,
  isValidRefreshDataContext,
  normalizeCredentials,
  createWatchFunctionContext,
  createRefreshDataContext,
  formatLoginSuccessMessage,
  formatWatchFunctionMessage,
  formatWatchFunctionLogMessage,
  formatRefreshDataMessage,
  createCommandError,
  createValidationError,
  isCommandError,
  isValidationError,
  COMMAND_NAMES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from '../../commands/commandsCore';

suite('CommandsCore', () => {
  suite('isValidUsername', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidUsername('user123'), true);
      assert.strictEqual(isValidUsername('test_user'), true);
      assert.strictEqual(isValidUsername('a'), true);
    });

    test('should return false for invalid usernames', () => {
      assert.strictEqual(isValidUsername(''), false);
      assert.strictEqual(isValidUsername('   '), false);
      assert.strictEqual(isValidUsername(null), false);
      assert.strictEqual(isValidUsername(undefined), false);
      assert.strictEqual(isValidUsername(123), false);
    });
  });

  suite('isValidPassword', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidPassword('password123'), true);
      assert.strictEqual(isValidPassword('secret!@#'), true);
      assert.strictEqual(isValidPassword('a'), true);
    });

    test('should return false for invalid passwords', () => {
      assert.strictEqual(isValidPassword(''), false);
      assert.strictEqual(isValidPassword('   '), false);
      assert.strictEqual(isValidPassword(null), false);
      assert.strictEqual(isValidPassword(undefined), false);
      assert.strictEqual(isValidPassword(123), false);
    });
  });

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

  suite('isValidLoginContext', () => {
    test('should return true for valid login context', () => {
      const context = { username: 'user', password: 'pass' };
      assert.strictEqual(isValidLoginContext(context), true);
    });

    test('should return false for invalid login context', () => {
      assert.strictEqual(isValidLoginContext(null), false);
      assert.strictEqual(isValidLoginContext({}), false);
      assert.strictEqual(isValidLoginContext({ username: 'user' }), false);
      assert.strictEqual(isValidLoginContext({ password: 'pass' }), false);
      assert.strictEqual(isValidLoginContext({ username: '', password: 'pass' }), false);
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

  suite('normalizeCredentials', () => {
    test('should trim whitespace from credentials', () => {
      const result = normalizeCredentials('  user  ', '  pass  ');
      assert.deepStrictEqual(result, { username: 'user', password: 'pass' });
    });

    test('should handle credentials without whitespace', () => {
      const result = normalizeCredentials('user', 'pass');
      assert.deepStrictEqual(result, { username: 'user', password: 'pass' });
    });
  });

  suite('createWatchFunctionContext', () => {
    test('should create watch function context with trimmed values', () => {
      const result = createWatchFunctionContext('  myFunc  ', '  module.myFunc  ');
      assert.deepStrictEqual(result, { functionName: 'myFunc', codeLensPath: 'module.myFunc' });
    });
  });

  suite('createRefreshDataContext', () => {
    test('should create refresh data context', () => {
      const result = createRefreshDataContext('python', true);
      assert.deepStrictEqual(result, { languageId: 'python', isActiveEditor: true });
    });
  });

  suite('formatLoginSuccessMessage', () => {
    test('should format login success message', () => {
      const result = formatLoginSuccessMessage('testuser');
      assert.strictEqual(result, 'Logged in successfully as testuser');
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

  suite('formatRefreshDataMessage', () => {
    test('should format refresh data message', () => {
      const result = formatRefreshDataMessage();
      assert.strictEqual(result, 'Function data refreshed successfully');
    });
  });

  suite('createCommandError', () => {
    test('should create command error with message', () => {
      const error = createCommandError('Test error');
      assert.strictEqual(error.message, 'Command error: Test error');
    });

    test('should create command error with context', () => {
      const error = createCommandError('Test error', 'login');
      assert.strictEqual(error.message, 'Command error in login: Test error');
    });
  });

  suite('createValidationError', () => {
    test('should create validation error with message', () => {
      const error = createValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
    });

    test('should create validation error with field context', () => {
      const error = createValidationError('Invalid input', 'username');
      assert.strictEqual(error.message, 'username: Invalid input');
    });
  });

  suite('isCommandError', () => {
    test('should identify command errors', () => {
      const commandError = createCommandError('Test');
      const regularError = new Error('Regular error');
      
      assert.strictEqual(isCommandError(commandError), true);
      assert.strictEqual(isCommandError(regularError), false);
      assert.strictEqual(isCommandError('not an error'), false);
    });
  });

  suite('isValidationError', () => {
    test('should identify validation errors', () => {
      const validationError = createValidationError('Test');
      const commandError = createCommandError('Test');
      
      assert.strictEqual(isValidationError(validationError), true);
      assert.strictEqual(isValidationError(commandError), false);
      assert.strictEqual(isValidationError('not an error'), false);
    });
  });

  suite('Constants', () => {
    test('should have correct COMMAND_NAMES', () => {
      assert.strictEqual(COMMAND_NAMES.LOGIN, 'prodwatch.login');
      assert.strictEqual(COMMAND_NAMES.REFRESH_DATA, 'prodwatch.refreshData');
      assert.strictEqual(COMMAND_NAMES.WATCH_FUNCTION, 'prodwatch.watchFunction');
    });

    test('should have correct ERROR_MESSAGES', () => {
      assert.strictEqual(ERROR_MESSAGES.INVALID_CREDENTIALS, 'Invalid username or password');
      assert.strictEqual(ERROR_MESSAGES.LOGIN_FAILED, 'Login failed. Please check your credentials and try again.');
      assert.strictEqual(ERROR_MESSAGES.NOT_PYTHON_FILE, 'Please open a Python file to refresh function data');
    });

    test('should have correct SUCCESS_MESSAGES', () => {
      assert.strictEqual(SUCCESS_MESSAGES.DATA_REFRESHED, 'Function data refreshed successfully');
    });
  });
});