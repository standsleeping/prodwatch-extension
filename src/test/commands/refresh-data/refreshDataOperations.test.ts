import * as assert from 'assert';
import {
  refreshDataOperation,
  getCurrentEditorContextOperation,
  executeRefreshDataCommandOperation,
  FileFocusServiceProvider,
  VSCodeProvider
} from '../../../commands/refresh-data/refreshDataOperations';

suite('RefreshDataOperations', () => {
  // Mock implementations
  const createMockFileFocusService = (shouldSucceed = true): FileFocusServiceProvider => ({
    async fetchDataForActiveFile(): Promise<void> {
      if (!shouldSucceed) {
        throw new Error('Failed to fetch data');
      }
    }
  });

  const createMockVSCodeProvider = (
    activeEditor?: { document: { languageId: string } }
  ): VSCodeProvider => ({
    async showInformationMessage(): Promise<string | undefined> {
      return undefined;
    },
    async showErrorMessage(): Promise<string | undefined> {
      return undefined;
    },
    async withProgress<R>(options: any, task: any): Promise<R> {
      return task();
    },
    getActiveTextEditor(): any {
      return activeEditor;
    }
  });

  suite('refreshDataOperation', () => {
    test('should refresh data successfully for Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const refreshContext = { languageId: 'python', isActiveEditor: true };

      const result = await refreshDataOperation(fileFocusService, refreshContext);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Function data refreshed successfully');
      }
    });

    test('should fail for non-Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const refreshContext = { languageId: 'javascript', isActiveEditor: true };

      const result = await refreshDataOperation(fileFocusService, refreshContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });

    test('should fail when no active editor', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const refreshContext = { languageId: 'python', isActiveEditor: false };

      const result = await refreshDataOperation(fileFocusService, refreshContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });

    test('should handle file focus service errors', async () => {
      const fileFocusService = createMockFileFocusService(false);
      const refreshContext = { languageId: 'python', isActiveEditor: true };

      const result = await refreshDataOperation(fileFocusService, refreshContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Failed to fetch data'));
      }
    });

    test('should return validation error for invalid context', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const refreshContext = { languageId: 'python' } as any; // Missing isActiveEditor

      const result = await refreshDataOperation(fileFocusService, refreshContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid refresh data context'));
      }
    });
  });

  suite('getCurrentEditorContextOperation', () => {
    test('should get context for active Python editor', () => {
      const activeEditor = { document: { languageId: 'python' } };
      const vscodeProvider = createMockVSCodeProvider(activeEditor);

      const result = getCurrentEditorContextOperation(vscodeProvider);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { languageId: 'python', isActiveEditor: true });
      }
    });

    test('should get context when no active editor', () => {
      const vscodeProvider = createMockVSCodeProvider(undefined);

      const result = getCurrentEditorContextOperation(vscodeProvider);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, { languageId: '', isActiveEditor: false });
      }
    });

    test('should handle errors when getting active editor', () => {
      const vscodeProvider: VSCodeProvider = {
        async showInformationMessage(): Promise<string | undefined> {
          return undefined;
        },
        async showErrorMessage(): Promise<string | undefined> {
          return undefined;
        },
        async withProgress<R>(options: any, task: any): Promise<R> {
          return task();
        },
        getActiveTextEditor(): any {
          throw new Error('VS Code API error');
        }
      };

      const result = getCurrentEditorContextOperation(vscodeProvider);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('VS Code API error'));
      }
    });
  });

  suite('executeRefreshDataCommandOperation', () => {
    test('should execute complete refresh flow successfully', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const activeEditor = { document: { languageId: 'python' } };
      const vscodeProvider = createMockVSCodeProvider(activeEditor);

      const result = await executeRefreshDataCommandOperation(fileFocusService, vscodeProvider);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, 'Function data refreshed successfully');
      }
    });

    test('should fail when no active editor', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const vscodeProvider = createMockVSCodeProvider(undefined);

      const result = await executeRefreshDataCommandOperation(fileFocusService, vscodeProvider);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });

    test('should fail for non-Python file', async () => {
      const fileFocusService = createMockFileFocusService(true);
      const activeEditor = { document: { languageId: 'javascript' } };
      const vscodeProvider = createMockVSCodeProvider(activeEditor);

      const result = await executeRefreshDataCommandOperation(fileFocusService, vscodeProvider);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Please open a Python file'));
      }
    });
  });
});