import * as assert from 'assert';
import {
  SecureStorage,
  GeneralStorage,
  storeTokenSafely,
  getTokenSafely,
  storeUsernameSafely,
  getUsernameSafely,
  deleteTokenSafely,
  clearUsernameSafely
} from '../../auth/storage';

suite('Storage', () => {

  // Simple in-memory storage implementations for testing
  const createMockSecureStorage = (shouldFail = false): SecureStorage => {
    const storage = new Map<string, string>();
    return {
      async get(key: string) {
        if (shouldFail) { throw new Error('Storage failed'); }
        return storage.get(key);
      },
      async store(key: string, value: string) {
        if (shouldFail) { throw new Error('Storage failed'); }
        storage.set(key, value);
      },
      async delete(key: string) {
        if (shouldFail) { throw new Error('Storage failed'); }
        storage.delete(key);
      }
    };
  };

  const createMockGeneralStorage = (shouldFail = false): GeneralStorage => {
    const storage = new Map<string, any>();
    return {
      get<T>(key: string): T | undefined {
        if (shouldFail) { throw new Error('Storage failed'); }
        return storage.get(key);
      },
      async update(key: string, value: any) {
        if (shouldFail) { throw new Error('Storage failed'); }
        storage.set(key, value);
      }
    };
  };

  suite('storeTokenSafely', () => {
    test('should return success result when storage succeeds', async () => {
      const storage = createMockSecureStorage();
      const result = await storeTokenSafely(storage, 'key', 'token');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, undefined);
      }
    });

    test('should return error result when storage fails', async () => {
      const storage = createMockSecureStorage(true);
      const result = await storeTokenSafely(storage, 'key', 'token');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
        assert.strictEqual(result.error.message, 'Storage failed');
      }
    });
  });

  suite('getTokenSafely', () => {
    test('should return success result with token when found', async () => {
      const storage = createMockSecureStorage();
      await storage.store('key', 'token');
      const result = await getTokenSafely(storage, 'key');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'token');
      }
    });

    test('should return success result with undefined when not found', async () => {
      const storage = createMockSecureStorage();
      const result = await getTokenSafely(storage, 'nonexistent');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, undefined);
      }
    });

    test('should return error result when storage fails', async () => {
      const storage = createMockSecureStorage(true);
      const result = await getTokenSafely(storage, 'key');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });
  });

  suite('storeUsernameSafely', () => {
    test('should return success result when storage succeeds', async () => {
      const storage = createMockGeneralStorage();
      const result = await storeUsernameSafely(storage, 'key', 'username');

      assert.strictEqual(result.success, true);
    });

    test('should return error result when storage fails', async () => {
      const storage = createMockGeneralStorage(true);
      const result = await storeUsernameSafely(storage, 'key', 'username');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });
  });

  suite('getUsernameSafely', () => {
    test('should return success result with username when found', () => {
      const storage = createMockGeneralStorage();
      storage.update('key', 'username');
      const result = getUsernameSafely(storage, 'key');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'username');
      }
    });

    test('should return success result with undefined when not found', () => {
      const storage = createMockGeneralStorage();
      const result = getUsernameSafely(storage, 'nonexistent');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, undefined);
      }
    });

    test('should return error result when storage fails', () => {
      const storage = createMockGeneralStorage(true);
      const result = getUsernameSafely(storage, 'key');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });
  });

  suite('deleteTokenSafely', () => {
    test('should return success result when deletion succeeds', async () => {
      const storage = createMockSecureStorage();
      await storage.store('key', 'token');
      const result = await deleteTokenSafely(storage, 'key');

      assert.strictEqual(result.success, true);
    });

    test('should return error result when deletion fails', async () => {
      const storage = createMockSecureStorage(true);
      const result = await deleteTokenSafely(storage, 'key');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });
  });

  suite('clearUsernameSafely', () => {
    test('should return success result when clearing succeeds', async () => {
      const storage = createMockGeneralStorage();
      const result = await clearUsernameSafely(storage, 'key');

      assert.strictEqual(result.success, true);
    });

    test('should return error result when clearing fails', async () => {
      const storage = createMockGeneralStorage(true);
      const result = await clearUsernameSafely(storage, 'key');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });
  });
});