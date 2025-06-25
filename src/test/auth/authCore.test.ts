import * as assert from 'assert';
import {
  isValidToken,
  isValidUsername,
  validateCredentials,
  createAuthState,
  normalizeCredentials,
  createStorageError,
  isStorageError,
  Credentials
} from '../../auth/authCore';

suite('AuthCore', () => {

  suite('isValidToken', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidToken('abc123'), true);
      assert.strictEqual(isValidToken('token-with-dashes'), true);
      assert.strictEqual(isValidToken('very-long-token-string-here'), true);
    });

    test('should return false for invalid tokens', () => {
      assert.strictEqual(isValidToken(''), false);
      assert.strictEqual(isValidToken(undefined), false);
      assert.strictEqual(isValidToken(null as any), false);
    });
  });

  suite('isValidUsername', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidUsername('user'), true);
      assert.strictEqual(isValidUsername('user@domain.com'), true);
      assert.strictEqual(isValidUsername('user_123'), true);
    });

    test('should return false for invalid usernames', () => {
      assert.strictEqual(isValidUsername(''), false);
      assert.strictEqual(isValidUsername(undefined), false);
      assert.strictEqual(isValidUsername(null as any), false);
    });
  });

  suite('validateCredentials', () => {
    test('should return empty array for valid credentials', () => {
      const result = validateCredentials({ username: 'user', token: 'token' });
      assert.deepStrictEqual(result, []);
    });

    test('should return errors for missing username', () => {
      const result = validateCredentials({ token: 'token' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], 'Username is required and must be non-empty');
    });

    test('should return errors for missing token', () => {
      const result = validateCredentials({ username: 'user' });
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], 'Token is required and must be non-empty');
    });

    test('should return multiple errors for empty credentials', () => {
      const result = validateCredentials({});
      assert.strictEqual(result.length, 2);
      assert.ok(result.includes('Username is required and must be non-empty'));
      assert.ok(result.includes('Token is required and must be non-empty'));
    });

    test('should return errors for empty strings', () => {
      const result = validateCredentials({ username: '', token: '' });
      assert.strictEqual(result.length, 2);
    });
  });

  suite('createAuthState', () => {
    test('should create authenticated state with valid token', () => {
      const result = createAuthState('valid-token', 'user');
      assert.deepStrictEqual(result, {
        isAuthenticated: true,
        username: 'user'
      });
    });

    test('should create unauthenticated state with invalid token', () => {
      const result = createAuthState(undefined, 'user');
      assert.deepStrictEqual(result, {
        isAuthenticated: false,
        username: 'user'
      });
    });

    test('should handle invalid username', () => {
      const result = createAuthState('token', undefined);
      assert.deepStrictEqual(result, {
        isAuthenticated: true,
        username: undefined
      });
    });

    test('should handle empty token', () => {
      const result = createAuthState('', 'user');
      assert.deepStrictEqual(result, {
        isAuthenticated: false,
        username: 'user'
      });
    });
  });

  suite('normalizeCredentials', () => {
    test('should trim whitespace from credentials', () => {
      const result = normalizeCredentials({
        username: '  user  ',
        token: '  token  '
      });
      assert.deepStrictEqual(result, {
        username: 'user',
        token: 'token'
      });
    });

    test('should handle undefined values', () => {
      const result = normalizeCredentials({});
      assert.deepStrictEqual(result, {
        username: '',
        token: ''
      });
    });

    test('should handle partial credentials', () => {
      const result = normalizeCredentials({ username: 'user' });
      assert.deepStrictEqual(result, {
        username: 'user',
        token: ''
      });
    });
  });

  suite('createStorageError', () => {
    test('should create error with operation message', () => {
      const error = createStorageError('store');
      assert.strictEqual(error.message, 'Failed to store credentials');
      assert.ok(error instanceof Error);
    });

    test('should include original error as cause', () => {
      const originalError = new Error('Original error');
      const error = createStorageError('retrieve', originalError);
      assert.strictEqual(error.message, 'Failed to retrieve credentials');
      assert.strictEqual(error.cause, originalError);
    });
  });

  suite('isStorageError', () => {
    test('should return true for Error instances', () => {
      assert.strictEqual(isStorageError(new Error('test')), true);
      assert.strictEqual(isStorageError(createStorageError('test')), true);
    });

    test('should return false for non-Error values', () => {
      assert.strictEqual(isStorageError('string'), false);
      assert.strictEqual(isStorageError(123), false);
      assert.strictEqual(isStorageError({}), false);
      assert.strictEqual(isStorageError(null), false);
      assert.strictEqual(isStorageError(undefined), false);
    });
  });
});