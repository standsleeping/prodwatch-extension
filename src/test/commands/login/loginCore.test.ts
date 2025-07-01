import * as assert from 'assert';
import {
  isValidUsername,
  isValidPassword,
  isValidLoginContext,
  normalizeCredentials,
  formatLoginSuccessMessage,
  createLoginError,
  createLoginValidationError,
  isLoginError,
  isLoginValidationError,
  LOGIN_COMMAND_NAME,
  LOGIN_ERROR_MESSAGES
} from '../../../commands/login/loginCore';

suite('LoginCore', () => {
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

  suite('formatLoginSuccessMessage', () => {
    test('should format login success message', () => {
      const result = formatLoginSuccessMessage('testuser');
      assert.strictEqual(result, 'Logged in successfully as testuser');
    });
  });

  suite('createLoginError', () => {
    test('should create login error with message', () => {
      const error = createLoginError('Test error');
      assert.strictEqual(error.message, 'Login error: Test error');
    });

    test('should create login error with context', () => {
      const error = createLoginError('Test error', 'login');
      assert.strictEqual(error.message, 'Login error in login: Test error');
    });
  });

  suite('createLoginValidationError', () => {
    test('should create login validation error with message', () => {
      const error = createLoginValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
    });

    test('should create login validation error with field context', () => {
      const error = createLoginValidationError('Invalid input', 'username');
      assert.strictEqual(error.message, 'username: Invalid input');
    });
  });

  suite('isLoginError', () => {
    test('should identify login errors', () => {
      const loginError = createLoginError('Test');
      const regularError = new Error('Regular error');
      
      assert.strictEqual(isLoginError(loginError), true);
      assert.strictEqual(isLoginError(regularError), false);
      assert.strictEqual(isLoginError('not an error'), false);
    });
  });

  suite('isLoginValidationError', () => {
    test('should identify login validation errors', () => {
      const validationError = createLoginValidationError('Test');
      const loginError = createLoginError('Test');
      
      assert.strictEqual(isLoginValidationError(validationError), true);
      assert.strictEqual(isLoginValidationError(loginError), false);
      assert.strictEqual(isLoginValidationError('not an error'), false);
    });
  });

  suite('Constants', () => {
    test('should have correct LOGIN_COMMAND_NAME', () => {
      assert.strictEqual(LOGIN_COMMAND_NAME, 'prodwatch.login');
    });

    test('should have correct LOGIN_ERROR_MESSAGES', () => {
      assert.strictEqual(LOGIN_ERROR_MESSAGES.INVALID_CREDENTIALS, 'Invalid username or password');
      assert.strictEqual(LOGIN_ERROR_MESSAGES.LOGIN_FAILED, 'Login failed. Please check your credentials and try again.');
    });
  });
});