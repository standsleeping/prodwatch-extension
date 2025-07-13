/**
 * Tests for API core pure functions
 * Following functional architecture patterns from RULES.md
 */

import { strict as assert } from 'assert';
import {
  isValidUsername,
  isValidPassword,
  isValidToken,
  isValidBaseUrl,
  isValidFunctionNames,
  validateLoginCredentials,
  createLoginRequest,
  createSearchRequest,
  isValidLoginResponse,
  isValidServerFunctionResponse,
  normalizeApiConfig,
  createApiError,
  isApiError,
  getErrorMessage,
  isUnauthorizedStatus,
  isClientError,
  isServerError
} from '../../api/apiCore';

suite('ApiCore', () => {
  suite('isValidUsername', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidUsername('user123'), true);
      assert.strictEqual(isValidUsername('test@example.com'), true);
      assert.strictEqual(isValidUsername('  spaced  '), true);
    });

    test('should return false for invalid usernames', () => {
      assert.strictEqual(isValidUsername(''), false);
      assert.strictEqual(isValidUsername('   '), false);
      assert.strictEqual(isValidUsername(undefined), false);
      assert.strictEqual(isValidUsername(null as any), false);
      assert.strictEqual(isValidUsername(123 as any), false);
    });
  });

  suite('isValidPassword', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidPassword('password123'), true);
      assert.strictEqual(isValidPassword('a'), true);
      assert.strictEqual(isValidPassword('   '), true);
    });

    test('should return false for invalid passwords', () => {
      assert.strictEqual(isValidPassword(''), false);
      assert.strictEqual(isValidPassword(undefined), false);
      assert.strictEqual(isValidPassword(null as any), false);
      assert.strictEqual(isValidPassword(123 as any), false);
    });
  });

  suite('isValidToken', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidToken('abc123'), true);
      assert.strictEqual(isValidToken('bearer-token-here'), true);
    });

    test('should return false for invalid tokens', () => {
      assert.strictEqual(isValidToken(''), false);
      assert.strictEqual(isValidToken(undefined), false);
      assert.strictEqual(isValidToken(null as any), false);
      assert.strictEqual(isValidToken(123 as any), false);
    });
  });

  suite('isValidBaseUrl', () => {
    test('should return true for valid URLs', () => {
      assert.strictEqual(isValidBaseUrl('https://example.com'), true);
      assert.strictEqual(isValidBaseUrl('http://localhost:3000'), true);
      assert.strictEqual(isValidBaseUrl('https://api.example.com/v1'), true);
    });

    test('should return false for invalid URLs', () => {
      assert.strictEqual(isValidBaseUrl('not-a-url'), false);
      assert.strictEqual(isValidBaseUrl(''), false);
      assert.strictEqual(isValidBaseUrl(undefined), false);
      assert.strictEqual(isValidBaseUrl('ftp://example.com'), true); // Valid URL, different protocol
    });
  });

  suite('isValidFunctionNames', () => {
    test('should return true for valid function name arrays', () => {
      assert.strictEqual(isValidFunctionNames(['func1']), true);
      assert.strictEqual(isValidFunctionNames(['func1', 'func2']), true);
      assert.strictEqual(isValidFunctionNames(['myFunction', 'anotherFunction']), true);
    });

    test('should return false for invalid function name arrays', () => {
      assert.strictEqual(isValidFunctionNames([]), false);
      assert.strictEqual(isValidFunctionNames(['', 'func']), false);
      assert.strictEqual(isValidFunctionNames([123, 'func'] as any), false);
      assert.strictEqual(isValidFunctionNames('not-array' as any), false);
      assert.strictEqual(isValidFunctionNames(undefined), false);
    });
  });

  suite('validateLoginCredentials', () => {
    test('should return empty array for valid credentials', () => {
      const result = validateLoginCredentials({
        username: 'user123',
        password: 'password123'
      });
      assert.deepStrictEqual(result, []);
    });

    test('should return errors for missing username', () => {
      const result = validateLoginCredentials({
        password: 'password123'
      });
      assert.strictEqual(result.length, 1);
      assert.ok(result[0].includes('Username'));
    });

    test('should return errors for missing password', () => {
      const result = validateLoginCredentials({
        username: 'user123'
      });
      assert.strictEqual(result.length, 1);
      assert.ok(result[0].includes('Password'));
    });

    test('should return multiple errors for missing fields', () => {
      const result = validateLoginCredentials({});
      assert.strictEqual(result.length, 2);
      assert.ok(result.some(err => err.includes('Username')));
      assert.ok(result.some(err => err.includes('Password')));
    });
  });

  suite('createLoginRequest', () => {
    test('should create login request with trimmed username', () => {
      const result = createLoginRequest({
        username: '  user123  ',
        password: 'password123'
      });
      assert.deepStrictEqual(result, {
        username: 'user123',
        password: 'password123'
      });
    });
  });

  suite('createSearchRequest', () => {
    test('should create search request with filtered function names', () => {
      const result = createSearchRequest(['func1', '  ', 'func2', ''], 'test-app');
      assert.deepStrictEqual(result, {
        event_name: 'search-function-calls',
        app_name: 'test-app',
        function_names: ['func1', 'func2']
      });
    });
  });

  suite('isValidLoginResponse', () => {
    test('should return true for valid login response', () => {
      const response = {
        token: 'abc123',
        user_id: 'user123',
        email: 'user@example.com'
      };
      assert.strictEqual(isValidLoginResponse(response), true);
    });

    test('should return false for invalid login response', () => {
      assert.strictEqual(isValidLoginResponse({}), false);
      assert.strictEqual(isValidLoginResponse({ token: '' }), false);
      assert.strictEqual(isValidLoginResponse({ token: 'abc', user_id: 'user' }), false);
      assert.strictEqual(isValidLoginResponse(null), false);
      assert.strictEqual(isValidLoginResponse('string'), false);
    });
  });

  suite('isValidServerFunctionResponse', () => {
    test('should return true for valid server function response', () => {
      const response = {
        function_names: ['func1'],
        total_calls: 5,
        functions: {
          func1: {
            calls: [],
            total_calls: 5
          }
        }
      };
      assert.strictEqual(isValidServerFunctionResponse(response), true);
    });

    test('should return false for invalid server function response', () => {
      assert.strictEqual(isValidServerFunctionResponse({}), false);
      assert.strictEqual(isValidServerFunctionResponse(null), false);
      assert.strictEqual(isValidServerFunctionResponse('string'), false);
      assert.strictEqual(isValidServerFunctionResponse({ function_names: 'not-array' }), false);
    });
  });

  suite('normalizeApiConfig', () => {
    test('should normalize API config with default baseUrl', () => {
      const result = normalizeApiConfig({});
      assert.deepStrictEqual(result, {
        baseUrl: 'https://getprodwatch.com'
      });
    });

    test('should normalize API config with custom baseUrl', () => {
      const result = normalizeApiConfig({
        baseUrl: '  https://custom.com  '
      });
      assert.deepStrictEqual(result, {
        baseUrl: 'https://custom.com'
      });
    });
  });

  suite('createApiError', () => {
    test('should create API error with message', () => {
      const error = createApiError('Test error');
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'Test error');
    });

    test('should create API error with status', () => {
      const error = createApiError('Test error', 404);
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual((error as any).status, 404);
    });
  });

  suite('isApiError', () => {
    test('should return true for Error instances', () => {
      assert.strictEqual(isApiError(new Error('test')), true);
      assert.strictEqual(isApiError(createApiError('test')), true);
    });

    test('should return false for non-Error values', () => {
      assert.strictEqual(isApiError('string'), false);
      assert.strictEqual(isApiError(123), false);
      assert.strictEqual(isApiError({}), false);
      assert.strictEqual(isApiError(null), false);
    });
  });

  suite('getErrorMessage', () => {
    test('should return error message for Error instances', () => {
      assert.strictEqual(getErrorMessage(new Error('test error')), 'test error');
    });

    test('should return string representation for non-Error values', () => {
      assert.strictEqual(getErrorMessage('string error'), 'string error');
      assert.strictEqual(getErrorMessage(123), '123');
      assert.strictEqual(getErrorMessage({}), '[object Object]');
    });
  });

  suite('HTTP status utilities', () => {
    suite('isUnauthorizedStatus', () => {
      test('should return true for 401', () => {
        assert.strictEqual(isUnauthorizedStatus(401), true);
      });

      test('should return false for other statuses', () => {
        assert.strictEqual(isUnauthorizedStatus(200), false);
        assert.strictEqual(isUnauthorizedStatus(404), false);
        assert.strictEqual(isUnauthorizedStatus(500), false);
      });
    });

    suite('isClientError', () => {
      test('should return true for 4xx statuses', () => {
        assert.strictEqual(isClientError(400), true);
        assert.strictEqual(isClientError(404), true);
        assert.strictEqual(isClientError(499), true);
      });

      test('should return false for non-4xx statuses', () => {
        assert.strictEqual(isClientError(200), false);
        assert.strictEqual(isClientError(399), false);
        assert.strictEqual(isClientError(500), false);
      });
    });

    suite('isServerError', () => {
      test('should return true for 5xx statuses', () => {
        assert.strictEqual(isServerError(500), true);
        assert.strictEqual(isServerError(502), true);
        assert.strictEqual(isServerError(599), true);
      });

      test('should return false for non-5xx statuses', () => {
        assert.strictEqual(isServerError(200), false);
        assert.strictEqual(isServerError(404), false);
        assert.strictEqual(isServerError(499), false);
        assert.strictEqual(isServerError(600), false);
      });
    });
  });
});