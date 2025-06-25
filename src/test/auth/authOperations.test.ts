import * as assert from 'assert';
import {
  storeCredentialsOperation,
  getCredentialsOperation,
  getAuthStateOperation,
  clearCredentialsOperation,
  AuthKeys
} from '../../auth/authOperations';
import { CredentialStorage, SecureStorage, GeneralStorage } from '../../auth/storage';

suite('AuthOperations', () => {

  const createMockStorage = (failSecrets = false, failGeneral = false): CredentialStorage => {
    const secretStorage = new Map<string, string>();
    const generalStorage = new Map<string, any>();

    return {
      secrets: {
        async get(key: string) {
          if (failSecrets) { throw new Error('Secrets failed'); }
          return secretStorage.get(key);
        },
        async store(key: string, value: string) {
          if (failSecrets) { throw new Error('Secrets failed'); }
          secretStorage.set(key, value);
        },
        async delete(key: string) {
          if (failSecrets) { throw new Error('Secrets failed'); }
          secretStorage.delete(key);
        }
      } as SecureStorage,
      globalState: {
        get<T>(key: string): T | undefined {
          if (failGeneral) { throw new Error('General storage failed'); }
          return generalStorage.get(key);
        },
        async update(key: string, value: any) {
          if (failGeneral) { throw new Error('General storage failed'); }
          generalStorage.set(key, value);
        }
      } as GeneralStorage
    };
  };

  const testKeys: AuthKeys = {
    token: 'test.token',
    username: 'test.username'
  };

  suite('storeCredentialsOperation', () => {
    test('should store valid credentials successfully', async () => {
      const storage = createMockStorage();
      const result = await storeCredentialsOperation(storage, testKeys, {
        username: 'testuser',
        token: 'testtoken'
      });

      assert.strictEqual(result.success, true);
    });

    test('should validate credentials before storing', async () => {
      const storage = createMockStorage();
      const result = await storeCredentialsOperation(storage, testKeys, {
        username: '', // Invalid
        token: 'testtoken'
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.validationErrors);
        assert.strictEqual(result.validationErrors.length, 1);
        assert.ok(result.validationErrors[0].includes('Username'));
      }
    });

    test('should handle storage failures', async () => {
      const storage = createMockStorage(true); // Fail secrets
      const result = await storeCredentialsOperation(storage, testKeys, {
        username: 'testuser',
        token: 'testtoken'
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to store'));
      }
    });

    test('should normalize credentials before validation', async () => {
      const storage = createMockStorage();
      const result = await storeCredentialsOperation(storage, testKeys, {
        username: '  testuser  ', // Has whitespace
        token: '  testtoken  '
      });

      assert.strictEqual(result.success, true);
    });
  });

  suite('getCredentialsOperation', () => {
    test('should retrieve stored credentials', async () => {
      const storage = createMockStorage();

      // Store credentials first
      await storage.secrets.store(testKeys.token, 'testtoken');
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await getCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.token, 'testtoken');
        assert.strictEqual(result.data.username, 'testuser');
      }
    });

    test('should handle missing credentials gracefully', async () => {
      const storage = createMockStorage();
      const result = await getCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.token, undefined);
        assert.strictEqual(result.data.username, undefined);
      }
    });

    test('should handle partial storage failures', async () => {
      const storage = createMockStorage(true, false); // Only secrets fail
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await getCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.token, undefined);
        assert.strictEqual(result.data.username, 'testuser');
      }
    });
  });

  suite('getAuthStateOperation', () => {
    test('should return authenticated state for valid token', async () => {
      const storage = createMockStorage();
      await storage.secrets.store(testKeys.token, 'testtoken');
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await getAuthStateOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.isAuthenticated, true);
        assert.strictEqual(result.data.username, 'testuser');
      }
    });

    test('should return unauthenticated state for missing token', async () => {
      const storage = createMockStorage();
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await getAuthStateOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.isAuthenticated, false);
        assert.strictEqual(result.data.username, 'testuser');
      }
    });

    test('should return unauthenticated state for empty token', async () => {
      const storage = createMockStorage();
      await storage.secrets.store(testKeys.token, ''); // Empty token
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await getAuthStateOperation(storage, testKeys);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.isAuthenticated, false);
        assert.strictEqual(result.data.username, 'testuser');
      }
    });
  });

  suite('clearCredentialsOperation', () => {
    test('should clear all credentials successfully', async () => {
      const storage = createMockStorage();

      // Store credentials first
      await storage.secrets.store(testKeys.token, 'testtoken');
      await storage.globalState.update(testKeys.username, 'testuser');

      const result = await clearCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, true);

      // Verify credentials are cleared
      const getResult = await getCredentialsOperation(storage, testKeys);
      if (getResult.success) {
        assert.strictEqual(getResult.data.token, undefined);
        assert.strictEqual(getResult.data.username, undefined);
      }
    });

    test('should handle secret storage failures', async () => {
      const storage = createMockStorage(true); // Fail secrets
      const result = await clearCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to clear'));
      }
    });

    test('should handle general storage failures', async () => {
      const storage = createMockStorage(false, true); // Fail general storage
      const result = await clearCredentialsOperation(storage, testKeys);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to clear'));
      }
    });
  });
});