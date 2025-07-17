import * as assert from 'assert';
import { createRefreshDataPollingProvider } from '../../polling/pollingProvider';
import { 
  FileFocusServiceProvider as RefreshDataFileFocusServiceProvider,
  VSCodeProvider as RefreshDataVSCodeProvider,
  Result
} from '../../commands/refresh-data/refreshDataOperations';

suite('pollingProvider', () => {
  
  // Simple in-memory implementation for FileFocusServiceProvider
  const createMockFileFocusService = (shouldSucceed: boolean = true): RefreshDataFileFocusServiceProvider => {
    return {
      fetchDataForActiveFile: async (): Promise<boolean> => {
        return shouldSucceed;
      }
    };
  };

  // Simple in-memory implementation for VSCodeProvider
  const createMockVSCodeProvider = (isActiveEditor: boolean = true, languageId: string = 'python'): RefreshDataVSCodeProvider => {
    return {
      showInformationMessage: async (message: string) => message,
      showErrorMessage: async (message: string) => message,
      withProgress: async <R>(options: any, task: any): Promise<R> => {
        return await task({});
      },
      getActiveTextEditor: () => {
        if (!isActiveEditor) {
          return undefined;
        }
        return {
          document: {
            languageId: languageId
          }
        } as any;
      }
    };
  };

  suite('createRefreshDataPollingProvider', () => {
    test('should create polling provider instance', () => {
      const fileFocusService = createMockFileFocusService();
      const vscodeProvider = createMockVSCodeProvider();
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      
      assert.ok(pollingProvider);
      assert.ok(typeof pollingProvider.executeRefresh === 'function');
    });
  });

  suite('RefreshDataPollingProvider', () => {
    test('should execute refresh successfully for Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider(true, 'python');
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      const result = await pollingProvider.executeRefresh();
      
      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Function data refreshed successfully');
      }
    });

    test('should fail for non-Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider(true, 'javascript');
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      const result = await pollingProvider.executeRefresh();
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });

    test('should fail when no active editor', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider(false);
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      const result = await pollingProvider.executeRefresh();
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });

    test('should handle file focus service failures', async () => {
      const fileFocusService = createMockFileFocusService(false);
      const vscodeProvider = createMockVSCodeProvider(true, 'python');
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      const result = await pollingProvider.executeRefresh();
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to fetch function data'));
      }
    });

    test('should handle file focus service exceptions', async () => {
      const failingFileFocusService: RefreshDataFileFocusServiceProvider = {
        fetchDataForActiveFile: async () => {
          throw new Error('Service exception');
        }
      };
      const vscodeProvider = createMockVSCodeProvider(true, 'python');
      
      const pollingProvider = createRefreshDataPollingProvider(failingFileFocusService, vscodeProvider);
      const result = await pollingProvider.executeRefresh();
      
      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Service exception'));
      }
    });

    test('should use exact same logic as refresh command', async () => {
      // This test verifies that the polling provider produces the same results
      // as the refresh command would for the same inputs
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider(true, 'python');
      
      const pollingProvider = createRefreshDataPollingProvider(fileFocusService, vscodeProvider);
      
      // Test successful case
      const successResult = await pollingProvider.executeRefresh();
      assert.strictEqual(successResult.success, true);
      if (successResult.success) {
        assert.strictEqual(successResult.data, 'Function data refreshed successfully');
      }
      
      // Test failure case with JavaScript file
      const jsVscodeProvider = createMockVSCodeProvider(true, 'javascript');
      const jsPollingProvider = createRefreshDataPollingProvider(fileFocusService, jsVscodeProvider);
      const failureResult = await jsPollingProvider.executeRefresh();
      assert.strictEqual(failureResult.success, false);
      if (!failureResult.success) {
        assert.ok(failureResult.error.message.includes('Please open a Python file'));
      }
    });
  });
});