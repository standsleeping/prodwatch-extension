import * as assert from 'assert';
import * as vscode from 'vscode';
import { PollingService } from '../../polling/pollingService';
import { WorkspaceConfigProvider, PollingProvider, Result } from '../../polling/pollingOperations';
import { PollingConfig } from '../../polling/pollingCore';

suite('pollingService', () => {
  
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

  // Helper to create a fresh polling service instance for each test
  const createPollingService = (
    workspaceConfig: WorkspaceConfigProvider,
    pollingProvider: PollingProvider
  ): PollingService => {
    // Reset singleton instance for testing
    (PollingService as any).instance = undefined;
    return PollingService.getInstance(workspaceConfig, pollingProvider);
  };

  suite('getInstance', () => {
    test('should return same instance for multiple calls', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const pollingProvider = createMockPollingProvider();
      
      const service1 = createPollingService(workspaceConfig, pollingProvider);
      const service2 = PollingService.getInstance(workspaceConfig, pollingProvider);
      
      assert.strictEqual(service1, service2);
    });
  });

  suite('startPolling', () => {
    test('should not start polling when disabled', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: false,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      
      assert.strictEqual(service.isActive(), false);
      assert.strictEqual(service.getCurrentConfig(), null);
    });

    test('should start polling when enabled', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      
      assert.strictEqual(service.isActive(), true);
      const config = service.getCurrentConfig();
      assert.ok(config);
      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.intervalSeconds, 30);
    });

    test('should handle configuration errors gracefully', () => {
      const failingWorkspaceConfig: WorkspaceConfigProvider = {
        getConfiguration: () => {
          throw new Error('Configuration failed');
        }
      };
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(failingWorkspaceConfig, pollingProvider);
      
      service.startPolling();
      
      assert.strictEqual(service.isActive(), false);
      assert.strictEqual(service.getCurrentConfig(), null);
    });
  });

  suite('stopPolling', () => {
    test('should stop active polling', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      assert.strictEqual(service.isActive(), true);
      
      service.stopPolling();
      
      assert.strictEqual(service.isActive(), false);
      assert.strictEqual(service.getCurrentConfig(), null);
    });

    test('should handle stopping when not active', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      // Should not throw when stopping inactive polling
      service.stopPolling();
      
      assert.strictEqual(service.isActive(), false);
    });
  });

  suite('restartPolling', () => {
    test('should restart polling with new configuration', () => {
      const settings = {
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      };
      const workspaceConfig = createMockWorkspaceConfig(settings);
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      assert.strictEqual(service.isActive(), true);
      assert.strictEqual(service.getCurrentConfig()?.intervalSeconds, 30);
      
      // Change configuration
      settings.pollingIntervalSeconds = 60;
      
      service.restartPolling();
      
      assert.strictEqual(service.isActive(), true);
      assert.strictEqual(service.getCurrentConfig()?.intervalSeconds, 60);
    });

    test('should handle restart when polling was disabled', () => {
      const settings = {
        pollingEnabled: false,
        pollingIntervalSeconds: 30
      };
      const workspaceConfig = createMockWorkspaceConfig(settings);
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      assert.strictEqual(service.isActive(), false);
      
      // Enable polling
      settings.pollingEnabled = true;
      
      service.restartPolling();
      
      assert.strictEqual(service.isActive(), true);
      assert.strictEqual(service.getCurrentConfig()?.enabled, true);
    });
  });

  suite('isActive', () => {
    test('should return false initially', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      assert.strictEqual(service.isActive(), false);
    });

    test('should return true when polling is active', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      
      assert.strictEqual(service.isActive(), true);
    });

    test('should return false after stopping', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      service.stopPolling();
      
      assert.strictEqual(service.isActive(), false);
    });
  });

  suite('getCurrentConfig', () => {
    test('should return null initially', () => {
      const workspaceConfig = createMockWorkspaceConfig();
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      assert.strictEqual(service.getCurrentConfig(), null);
    });

    test('should return current configuration when polling is active', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 45
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      
      const config = service.getCurrentConfig();
      assert.ok(config);
      assert.strictEqual(config.enabled, true);
      assert.strictEqual(config.intervalSeconds, 45);
    });

    test('should return null after stopping', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      service.startPolling();
      service.stopPolling();
      
      assert.strictEqual(service.getCurrentConfig(), null);
    });
  });

  suite('polling lifecycle', () => {
    test('should maintain proper state throughout lifecycle', () => {
      const workspaceConfig = createMockWorkspaceConfig({
        pollingEnabled: true,
        pollingIntervalSeconds: 30
      });
      const pollingProvider = createMockPollingProvider();
      const service = createPollingService(workspaceConfig, pollingProvider);
      
      // Initial state
      assert.strictEqual(service.isActive(), false);
      assert.strictEqual(service.getCurrentConfig(), null);
      
      // Start polling
      service.startPolling();
      assert.strictEqual(service.isActive(), true);
      assert.ok(service.getCurrentConfig());
      
      // Stop polling
      service.stopPolling();
      assert.strictEqual(service.isActive(), false);
      assert.strictEqual(service.getCurrentConfig(), null);
      
      // Restart polling
      service.restartPolling();
      assert.strictEqual(service.isActive(), true);
      assert.ok(service.getCurrentConfig());
      
      // Clean up
      service.stopPolling();
    });
  });
});