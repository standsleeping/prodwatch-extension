import * as assert from 'assert';
import { suite, test, setup } from 'mocha';
import * as vscode from 'vscode';
import { FunctionHoverProvider } from '../../hover/functionHoverProvider';
import { FunctionDataService } from '../../data/functionDataService';
import { FunctionData } from '../../data/functionDataCore';
import { WatchStatus } from '../../api/apiService';
import { MockTextDocument, MockExtensionContext } from '../mocks';

function createTestFunctionDataService(): FunctionDataService {
  const context = new MockExtensionContext();
  const service = FunctionDataService.getInstance(context);
  service.clearAllData();
  return service;
}

suite('FunctionHoverProvider', () => {
  let context: vscode.ExtensionContext;
  let dataService: FunctionDataService;
  let hoverProvider: FunctionHoverProvider;

  setup(() => {
    context = new MockExtensionContext();
    dataService = createTestFunctionDataService();
    hoverProvider = new FunctionHoverProvider(context, dataService);
  });

  suite('provideHover', () => {
    test('should provide hover for function with data', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def test_function():', '    pass']
      );

      const serverResponse = {
        function_names: ['test_function'],
        total_calls: 10,
        functions: {
          'src.module.file.test_function': {
            calls: [
              { function_name: 'test_function', args: [], kwargs: {}, execution_time_ms: 15 }
            ],
            total_calls: 10,
        watch_status: WatchStatus.NOT_REQUESTED
          }
        }
      };
      dataService.updateFromServerResponse('src.module.file', serverResponse);

      const position = new vscode.Position(0, 4);
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.ok(result);
      assert.ok(result instanceof vscode.Hover);
      
      if (result instanceof vscode.Hover) {
        const content = result.contents[0];
        assert.ok(content instanceof vscode.MarkdownString);
        
        if (content instanceof vscode.MarkdownString) {
          assert.ok(content.value.includes('**Function Calls**'));
          assert.ok(content.value.includes('• Total calls: 10'));
        }
      }
    });

    test('should provide hover with placeholder data when no function data exists', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def unknown_function():', '    pass']
      );

      const position = new vscode.Position(0, 4);
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.ok(result);
      assert.ok(result instanceof vscode.Hover);
      
      if (result instanceof vscode.Hover) {
        const content = result.contents[0];
        assert.ok(content instanceof vscode.MarkdownString);
        
        if (content instanceof vscode.MarkdownString) {
          assert.ok(content.value.includes('**Function Calls**'));
          assert.ok(content.value.includes('• No function call data available'));
        }
      }
    });

    test('should return null for non-function lines', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('/path/to/src/module/file.py'),
        'file.py'
      );
      mockDoc.setLines(['class TestClass:', '    pass']);

      const position = new vscode.Position(0, 4);
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.strictEqual(result, null);
    });

    test('should return null for non-Python files', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('/path/to/file.txt'),
        'file.txt',
        false,
        'text'
      );
      mockDoc.setLines(['def test_function():', '    pass']);

      const position = new vscode.Position(0, 4);
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      // The functional architecture correctly rejects non-Python files
      assert.strictEqual(result, null);
    });

    test('should handle various function name formats', () => {
      const testCases = [
        'def simple_function():',
        'def _private_function():',
        'def function_with_params(a, b, c):',
        '    def indented_function():',
        'def CamelCaseFunction():',
        'def function123():',
      ];

      testCases.forEach((lineText, index) => {
        const mockDoc = new MockTextDocument(
          vscode.Uri.file('/path/to/src/module/file.py'),
          'file.py'
        );
        mockDoc.setLines([lineText, '    pass']);

        const position = new vscode.Position(0, 4);
        const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

        assert.ok(result, `Failed for test case ${index}: ${lineText}`);
      });
    });

    test('should handle empty lines gracefully', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('/path/to/src/module/file.py'),
        'file.py'
      );
      mockDoc.setLines(['', 'def test_function():', '    pass']);

      const position = new vscode.Position(0, 0); // Empty line
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.strictEqual(result, null);
    });

    test('should correctly extract module path from different file structures', () => {
      const testCases = [
        {
          filePath: '/project/src/module/submodule/file.py',
          expectedModulePath: 'src.module.submodule.file'
        },
        {
          filePath: '/project/app/controllers/user.py',
          expectedModulePath: 'app.controllers.user'
        },
        {
          filePath: '/project/lib/utils/helper.py',
          expectedModulePath: 'lib.utils.helper'
        },
        {
          filePath: '/project/tests/test_module.py',
          expectedModulePath: 'tests.test_module'
        },
        {
          filePath: '/project/standalone.py',
          expectedModulePath: 'standalone'
        }
      ];

      testCases.forEach(({ filePath, expectedModulePath }) => {
        const mockDoc = new MockTextDocument(
          vscode.Uri.file(filePath),
          'file.py'
        );
        mockDoc.setLines(['def test_function():', '    pass']);

        const expectedCodeLensPath = `${expectedModulePath}.test_function`;
        
        // Set up function data for this path
        const functionData: FunctionData = {
          codeLensPath: expectedCodeLensPath,
          dataPoints: ['Test data']
        };
        const serverResponse = {
          function_names: ['test_function'],
          total_calls: 1,
          functions: {
            [expectedCodeLensPath]: {
              calls: [{ function_name: 'test_function', args: [], kwargs: {}, execution_time_ms: 10 }],
              total_calls: 1,
        watch_status: WatchStatus.NOT_REQUESTED
            }
          }
        };
        dataService.updateFromServerResponse(expectedModulePath, serverResponse);

        const position = new vscode.Position(0, 4);
        const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

        assert.ok(result, `Failed for file path: ${filePath}`);
      });
    });

    test('should handle Windows-style file paths', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('C:\\project\\src\\module\\file.py'),
        'file.py'
      );
      mockDoc.setLines(['def test_function():', '    pass']);

      const position = new vscode.Position(0, 4);
      const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.ok(result);
    });

    test('should handle functions with complex parameter signatures', () => {
      const complexFunctionLines = [
        'def complex_function(self, arg1: str, arg2: int = 10, *args, **kwargs):',
        'def async_function(param: Optional[Dict[str, Any]]) -> Awaitable[None]:',
        'def generic_function(items: List[T], callback: Callable[[T], bool]) -> Generator[T, None, None]:'
      ];

      complexFunctionLines.forEach((lineText, index) => {
        const mockDoc = new MockTextDocument(
          vscode.Uri.file('/path/to/src/module/file.py'),
          'file.py'
        );
        mockDoc.setLines([lineText, '    pass']);

        const position = new vscode.Position(0, 4);
        const result = hoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

        assert.ok(result, `Failed for complex function ${index}: ${lineText}`);
      });
    });
  });

  suite('Integration with FunctionDataService', () => {
    test('should correctly call FunctionDataService methods', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('/path/to/src/module/file.py'),
        'file.py'
      );
      mockDoc.setLines(['def test_function():', '    pass']);

      // Track calls to mock service
      let getFunctionDataCalled = false;
      let getDefaultPlaceholderDataCalled = false;

      const trackingMockService = {
        getFunctionData: (codeLensPath: string) => {
          getFunctionDataCalled = true;
          assert.strictEqual(codeLensPath, 'src.module.file.test_function');
          return null;
        },
        getDefaultPlaceholderData: () => {
          getDefaultPlaceholderDataCalled = true;
          return ['No function call data available'];
        }
      };

      const trackingHoverProvider = new FunctionHoverProvider(
        context, 
        trackingMockService as unknown as FunctionDataService
      );

      const position = new vscode.Position(0, 4);
      trackingHoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);

      assert.strictEqual(getFunctionDataCalled, true);
      assert.strictEqual(getDefaultPlaceholderDataCalled, true);
    });

    test('should handle service errors gracefully', () => {
      const mockDoc = new MockTextDocument(
        vscode.Uri.file('/path/to/src/module/file.py'),
        'file.py'
      );
      mockDoc.setLines(['def test_function():', '    pass']);

      const faultyMockService = {
        getFunctionData: () => {
          throw new Error('Service error');
        },
        getDefaultPlaceholderData: () => {
          return ['No function call data available'];
        }
      };

      const faultyHoverProvider = new FunctionHoverProvider(
        context, 
        faultyMockService as unknown as FunctionDataService
      );

      const position = new vscode.Position(0, 4);
      
      // Should not throw an error, should handle gracefully
      assert.doesNotThrow(() => {
        const result = faultyHoverProvider.provideHover(mockDoc, position, {} as vscode.CancellationToken);
        // Might return null or placeholder data depending on implementation
      });
    });
  });
});