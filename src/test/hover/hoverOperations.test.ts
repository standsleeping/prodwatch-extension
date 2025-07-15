import * as assert from 'assert';
import { suite, test } from 'mocha';
import * as vscode from 'vscode';
import {
  Result,
  HoverDataProvider,
  VSCodeHover,
  VSCodeMarkdownString,
  VSCodeHoverResult,
  parseHoverContextOperation,
  extractFunctionMatchOperation,
  getFunctionDataOperation,
  createHoverContentOperation,
  createVSCodeHoverOperation,
  provideHoverOperation
} from '../../hover/hoverOperations';
import { HoverContext, FunctionMatch, HoverContentData } from '../../hover/hoverCore';
import { FunctionData } from '../../data/functionDataCore';
import { FunctionDataService } from '../../data/functionDataService';
import { WatchStatus } from '../../api/apiService';
import { MockTextDocument, MockExtensionContext } from '../mocks';

function createInMemoryFunctionDataService(): FunctionDataService {
  const context = new MockExtensionContext();
  const service = FunctionDataService.getInstance(context);
  service.clearAllData();
  return service;
}

class VSCodeHoverFactory implements VSCodeHover {
  public lastMarkdownContent = '';
  public shouldThrow = false;

  createMarkdownString(): VSCodeMarkdownString {
    if (this.shouldThrow) {
      throw new Error('Mock VS Code error');
    }
    
    return {
      appendMarkdown: (content: string) => {
        this.lastMarkdownContent += content;
      }
    };
  }

  createHover(content: VSCodeMarkdownString): VSCodeHoverResult {
    if (this.shouldThrow) {
      throw new Error('Mock VS Code error');
    }
    
    return { mockHover: true } as unknown as VSCodeHoverResult;
  }
}

class FunctionDataServiceAdapter implements HoverDataProvider {
  constructor(private dataService: FunctionDataService) {}

  getFunctionData(codeLensPath: string): FunctionData | null {
    return this.dataService.getFunctionData(codeLensPath);
  }

  getDefaultPlaceholderData(): string[] {
    return this.dataService.getDefaultPlaceholderData();
  }
}

suite('HoverOperations', () => {
  suite('parseHoverContextOperation', () => {
    test('should parse valid document and position', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def test_function():', '    pass']
      );
      
      const position = new vscode.Position(0, 4);
      const result = parseHoverContextOperation(mockDoc, position);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.filePath, '/path/to/src/module/file.py');
        assert.strictEqual(result.data.lineText, 'def test_function():');
        assert.strictEqual(result.data.position, 4);
      }
    });

    test('should handle document parsing errors', () => {
      const mockDoc = MockTextDocument.createTextFile(
        '/invalid/path.txt', // Invalid Python file
        ['def test_function():']
      );
      
      const position = new vscode.Position(0, 0);
      const result = parseHoverContextOperation(mockDoc, position);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid hover context'));
      }
    });
  });

  suite('extractFunctionMatchOperation', () => {
    test('should extract function match from valid context', () => {
      const context: HoverContext = {
        filePath: '/path/to/src/module/file.py',
        lineText: 'def test_function():',
        position: 4
      };

      const result = extractFunctionMatchOperation(context);

      assert.strictEqual(result.success, true);
      if (result.success && result.data) {
        assert.strictEqual(result.data.functionName, 'test_function');
        assert.strictEqual(result.data.modulePath, 'src.module.file');
        assert.strictEqual(result.data.codeLensPath, 'src.module.file.test_function');
      }
    });

    test('should return null for non-function lines', () => {
      const context: HoverContext = {
        filePath: '/path/to/src/module/file.py',
        lineText: 'class TestClass:',
        position: 4
      };

      const result = extractFunctionMatchOperation(context);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
    });

    test('should return error for invalid context', () => {
      const invalidContext = {
        filePath: 'invalid.txt',
        lineText: 'def test():',
        position: 0
      };

      const result = extractFunctionMatchOperation(invalidContext as HoverContext);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid hover context'));
      }
    });
  });

  suite('getFunctionDataOperation', () => {
    test('should get function data when it exists', () => {
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);
      
      const serverResponse = {
        function_names: ['test_function'],
        total_calls: 5,
        functions: {
          'module.test_function': {
            calls: [
              { function_name: 'test_function', args: [], kwargs: {}, execution_time_ms: 10 }
            ],
            total_calls: 5,
        watch_status: WatchStatus.NOT_REQUESTED
          }
        }
      };
      dataService.updateFromServerResponse('module', serverResponse);

      const result = getFunctionDataOperation(dataProvider, 'module.test_function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(result.data.length > 0);
        assert.ok(result.data[0].includes('Total calls: 5'));
      }
    });

    test('should return placeholder data when function data does not exist', () => {
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);

      const result = getFunctionDataOperation(dataProvider, 'nonexistent.function');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, ['No function call data available']);
      }
    });

    test('should return error for invalid code lens path', () => {
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);

      const result = getFunctionDataOperation(dataProvider, '');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid code lens path'));
      }
    });
  });

  suite('createHoverContentOperation', () => {
    test('should create hover content with custom title', () => {
      const dataPoints = ['Total calls: 5', 'Recent calls: 3'];
      const title = 'Custom Title';

      const result = createHoverContentOperation(dataPoints, title);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.title, 'Custom Title');
        assert.deepStrictEqual(result.data.dataPoints, dataPoints);
      }
    });

    test('should create hover content with default title', () => {
      const dataPoints = ['Total calls: 5'];

      const result = createHoverContentOperation(dataPoints);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.title, '**Function Calls**');
        assert.deepStrictEqual(result.data.dataPoints, dataPoints);
      }
    });

    test('should return error for invalid data points', () => {
      const invalidDataPoints = ['valid', null] as unknown as string[];

      const result = createHoverContentOperation(invalidDataPoints);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('Invalid data points'));
      }
    });
  });

  suite('createVSCodeHoverOperation', () => {
    test('should create VS Code hover successfully', () => {
      const contentData: HoverContentData = {
        title: '**Function Calls**',
        dataPoints: ['Total calls: 5', 'Recent calls: 3']
      };
      const hoverFactory = new VSCodeHoverFactory();

      const result = createVSCodeHoverOperation(contentData, hoverFactory);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(result.data);
        assert.ok(hoverFactory.lastMarkdownContent.includes('**Function Calls**'));
        assert.ok(hoverFactory.lastMarkdownContent.includes('• Total calls: 5'));
        assert.ok(hoverFactory.lastMarkdownContent.includes('• Recent calls: 3'));
      }
    });

    test('should handle VS Code hover creation errors', () => {
      const contentData: HoverContentData = {
        title: '**Function Calls**',
        dataPoints: ['Total calls: 5']
      };
      const hoverFactory = new VSCodeHoverFactory();
      hoverFactory.shouldThrow = true;

      const result = createVSCodeHoverOperation(contentData, hoverFactory);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('creating VS Code hover'));
      }
    });
  });

  suite('provideHoverOperation', () => {
    test('should provide hover for valid function', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def test_function():', '    pass']
      );

      const position = new vscode.Position(0, 4);
      
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);
      const serverResponse = {
        function_names: ['test_function'],
        total_calls: 5,
        functions: {
          'src.module.file.test_function': {
            calls: [{ function_name: 'test_function', args: [], kwargs: {}, execution_time_ms: 10 }],
            total_calls: 5,
        watch_status: WatchStatus.NOT_REQUESTED
          }
        }
      };
      dataService.updateFromServerResponse('src.module.file', serverResponse);
      
      const hoverFactory = new VSCodeHoverFactory();

      const result = provideHoverOperation(mockDoc, position, dataProvider, hoverFactory);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.ok(result.data);
      }
    });

    test('should return null when no function found at position', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['class TestClass:', '    pass']
      );

      const position = new vscode.Position(0, 4);
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);
      const hoverFactory = new VSCodeHoverFactory();

      const result = provideHoverOperation(mockDoc, position, dataProvider, hoverFactory);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data, null);
      }
    });

    test('should handle parsing errors gracefully', () => {
      const mockDoc = MockTextDocument.createTextFile(
        '/path/to/invalid.txt', // Invalid Python file
        ['def test_function():']
      );

      const position = new vscode.Position(0, 0);
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);
      const hoverFactory = new VSCodeHoverFactory();

      const result = provideHoverOperation(mockDoc, position, dataProvider, hoverFactory);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error instanceof Error);
      }
    });

    test('should handle data provider errors', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def test_function():', '    pass']
      );

      const position = new vscode.Position(0, 4);
      
      const faultyDataProvider: HoverDataProvider = {
        getFunctionData: () => { throw new Error('Service error'); },
        getDefaultPlaceholderData: () => { throw new Error('Service error'); }
      };
      
      const hoverFactory = new VSCodeHoverFactory();

      const result = provideHoverOperation(mockDoc, position, faultyDataProvider, hoverFactory);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('retrieving function data'));
      }
    });

    test('should handle VS Code hover factory errors', () => {
      const mockDoc = MockTextDocument.createPythonFile(
        '/path/to/src/module/file.py',
        ['def test_function():', '    pass']
      );

      const position = new vscode.Position(0, 4);
      const dataService = createInMemoryFunctionDataService();
      const dataProvider = new FunctionDataServiceAdapter(dataService);
      
      const hoverFactory = new VSCodeHoverFactory();
      hoverFactory.shouldThrow = true;

      const result = provideHoverOperation(mockDoc, position, dataProvider, hoverFactory);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.ok(result.error.message.includes('creating VS Code hover'));
      }
    });
  });
});