import * as assert from 'assert';
import * as vscode from 'vscode';
import {
  Result,
  WorkspaceConfigProvider,
  PollingProvider,
  getPollingConfigOperation,
  executePollingRefreshOperation,
  validatePollingConfigOperation,
  shouldPollingBeActiveOperation,
  getPollingIntervalMsOperation
} from '../../polling/pollingOperations';
import { PollingConfig } from '../../polling/pollingCore';

suite('pollingOperations', () => {
  
  // Simple in-memory implementation for WorkspaceConfigProvider
  const createMockWorkspaceConfig = (settings: Record<string, any> = {}): WorkspaceConfigProvider => {
    const mockConfig = {
      get: <T>(key: string, defaultValue?: T): T => {
        return settings[key] !== undefined ? settings[key] : defaultValue;
      },
      update: async (key: string, value: any) => {
        settings[key] = value;
      },
      inspect: () => ({ key: '', defaultValue: undefined }),
      has: (key: string) => settings.hasOwnProperty(key)
    } as vscode.WorkspaceConfiguration;

    return {
      getConfiguration: (section: string) => mockConfig
    };
  };

  // Simple in-memory implementation for PollingProvider
  const createMockPollingProvider = (shouldSucceed: boolean = true, message: string = 'Success'): PollingProvider => {
    return {
      executeRefresh: async (): Promise<Result<string>> => {
        if (shouldSucceed) {
          return { success: true, data: message };
        } else {
          return { success: false, error: new Error(message) };
        }
      }
    };
  };

  suite('getPollingConfigOperation', () => {
    test('should return default configuration when no settings exist', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const result = getPollingConfigOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, {
          intervalSeconds: 30,
          enabled: false
        });
      }
    });

    test('should return custom configuration from settings', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingIntervalSeconds: 60,
        pollingEnabled: true
      });
      const result = getPollingConfigOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, {
          intervalSeconds: 60,
          enabled: true
        });
      }
    });

    test('should normalize invalid interval values', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingIntervalSeconds: 400, // Above maximum
        pollingEnabled: true
      });
      const result = getPollingConfigOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.intervalSeconds, 300); // Clamped to maximum
        assert.strictEqual(result.data.enabled, true);
      }
    });

    test('should handle configuration errors gracefully', () => {
      const failingWorkspaceConfig: WorkspaceConfigProvider = {
        getConfiguration: () => {
          throw new Error('Configuration failed');
        }
      };
      
      const result = getPollingConfigOperation(failingWorkspaceConfig);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Configuration failed'));
      }
    });
  });

  suite('executePollingRefreshOperation', () => {
    test('should return success when polling provider succeeds', async () => {
      const pollingProvider = createMockPollingProvider(true, 'Refresh successful');
      const result = await executePollingRefreshOperation(pollingProvider);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Refresh successful');
      }
    });

    test('should return error when polling provider fails', async () => {
      const pollingProvider = createMockPollingProvider(false, 'Refresh failed');
      const result = await executePollingRefreshOperation(pollingProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Refresh failed'));
      }
    });

    test('should handle polling provider exceptions', async () => {
      const failingPollingProvider: PollingProvider = {
        executeRefresh: async () => {
          throw new Error('Provider exception');
        }
      };
      
      const result = await executePollingRefreshOperation(failingPollingProvider);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Provider exception'));
      }
    });
  });

  suite('validatePollingConfigOperation', () => {
    test('should validate correct configuration', () => {
      const result = validatePollingConfigOperation(30, true);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, {
          intervalSeconds: 30,
          enabled: true
        });
      }
    });

    test('should validate and normalize configuration', () => {
      const result = validatePollingConfigOperation(400, false);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.intervalSeconds, 300); // Normalized
        assert.strictEqual(result.data.enabled, false);
      }
    });

    test('should handle disabled configuration', () => {
      const result = validatePollingConfigOperation(60, false);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.enabled, false);
      }
    });
  });

  suite('shouldPollingBeActiveOperation', () => {
    test('should return true when polling is enabled', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      
      const result = shouldPollingBeActiveOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, true);
      }
    });

    test('should return false when polling is disabled', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: false,
        pollingIntervalSeconds: 30
      });
      
      const result = shouldPollingBeActiveOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, false);
      }
    });

    test('should return false by default when no configuration exists', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      
      const result = shouldPollingBeActiveOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, false);
      }
    });

    test('should propagate configuration errors', () => {
      const failingWorkspaceConfig: WorkspaceConfigProvider = {
        getConfiguration: () => {
          throw new Error('Configuration failed');
        }
      };
      
      const result = shouldPollingBeActiveOperation(failingWorkspaceConfig);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Configuration failed'));
      }
    });
  });

  suite('getPollingIntervalMsOperation', () => {
    test('should return default interval in milliseconds', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const result = getPollingIntervalMsOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 30000); // 30 seconds * 1000
      }
    });

    test('should return custom interval in milliseconds', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingIntervalSeconds: 60
      });
      const result = getPollingIntervalMsOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 60000); // 60 seconds * 1000
      }
    });

    test('should handle minimum interval correctly', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingIntervalSeconds: 5
      });
      const result = getPollingIntervalMsOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 5000); // 5 seconds * 1000
      }
    });

    test('should handle maximum interval correctly', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingIntervalSeconds: 300
      });
      const result = getPollingIntervalMsOperation(workspaceConfig);
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 300000); // 300 seconds * 1000
      }
    });

    test('should propagate configuration errors', () => {
      const failingWorkspaceConfig: WorkspaceConfigProvider = {
        getConfiguration: () => {
          throw new Error('Configuration failed');
        }
      };
      
      const result = getPollingIntervalMsOperation(failingWorkspaceConfig);
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Configuration failed'));
      }
    });
  });
});