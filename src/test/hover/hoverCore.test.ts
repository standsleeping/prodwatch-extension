import * as assert from 'assert';
import { suite, test } from 'mocha';
import {
  // Types
  HoverContext,
  FunctionMatch,
  HoverContentData,

  // Constants
  FUNCTION_REGEX,
  ROOT_MARKERS,
  DEFAULT_HOVER_TITLE,

  // Validation functions
  isValidFilePath,
  isValidLineText,
  isValidPosition,
  isValidHoverContext,
  isValidFunctionName,
  isValidDataPoints,

  // Transformation functions
  extractFunctionName,
  getModulePath,
  createCodeLensPath,
  createFunctionMatch,

  // Formatting functions
  formatHoverTitle,
  formatDataPoint,
  formatDataPoints,
  createHoverContent,
  createHoverContentData,

  // Error functions
  createHoverError,
  createValidationError,
  isHoverError,
  isValidationError
} from '../../hover/hoverCore';

suite('HoverCore', () => {
  suite('isValidFilePath', () => {
    test('should return true for valid Python file paths', () => {
      assert.strictEqual(isValidFilePath('/path/to/file.py'), true);
      assert.strictEqual(isValidFilePath('relative/path/file.py'), true);
      assert.strictEqual(isValidFilePath('file.py'), true);
    });

    test('should return false for invalid file paths', () => {
      assert.strictEqual(isValidFilePath(''), false);
      assert.strictEqual(isValidFilePath('/path/to/file.txt'), false);
      assert.strictEqual(isValidFilePath('/path/to/file'), false);
      assert.strictEqual(isValidFilePath(null), false);
      assert.strictEqual(isValidFilePath(undefined), false);
      assert.strictEqual(isValidFilePath(123), false);
    });
  });

  suite('isValidLineText', () => {
    test('should return true for valid line text', () => {
      assert.strictEqual(isValidLineText('def function_name():'), true);
      assert.strictEqual(isValidLineText(''), true);
      assert.strictEqual(isValidLineText('    def indented_function():'), true);
    });

    test('should return false for invalid line text', () => {
      assert.strictEqual(isValidLineText(null), false);
      assert.strictEqual(isValidLineText(undefined), false);
      assert.strictEqual(isValidLineText(123), false);
    });
  });

  suite('isValidPosition', () => {
    test('should return true for valid positions', () => {
      assert.strictEqual(isValidPosition(0), true);
      assert.strictEqual(isValidPosition(10), true);
      assert.strictEqual(isValidPosition(100), true);
    });

    test('should return false for invalid positions', () => {
      assert.strictEqual(isValidPosition(-1), false);
      assert.strictEqual(isValidPosition('0'), false);
      assert.strictEqual(isValidPosition(null), false);
      assert.strictEqual(isValidPosition(undefined), false);
    });
  });

  suite('isValidHoverContext', () => {
    test('should return true for valid hover context', () => {
      const context: HoverContext = {
        filePath: '/path/to/file.py',
        lineText: 'def function_name():',
        position: 5
      };
      assert.strictEqual(isValidHoverContext(context), true);
    });

    test('should return false for invalid hover context', () => {
      assert.strictEqual(isValidHoverContext(null), false);
      assert.strictEqual(isValidHoverContext(undefined), false);
      assert.strictEqual(isValidHoverContext({}), false);
      assert.strictEqual(isValidHoverContext({
        filePath: 'invalid.txt',
        lineText: 'def func():',
        position: 0
      }), false);
    });
  });

  suite('isValidFunctionName', () => {
    test('should return true for valid function names', () => {
      assert.strictEqual(isValidFunctionName('function_name'), true);
      assert.strictEqual(isValidFunctionName('_private_function'), true);
      assert.strictEqual(isValidFunctionName('function123'), true);
      assert.strictEqual(isValidFunctionName('CamelCaseFunction'), true);
    });

    test('should return false for invalid function names', () => {
      assert.strictEqual(isValidFunctionName(''), false);
      assert.strictEqual(isValidFunctionName('123function'), false);
      assert.strictEqual(isValidFunctionName('function-name'), false);
      assert.strictEqual(isValidFunctionName('function name'), false);
      assert.strictEqual(isValidFunctionName(null), false);
      assert.strictEqual(isValidFunctionName(undefined), false);
    });
  });

  suite('isValidDataPoints', () => {
    test('should return true for valid data points arrays', () => {
      assert.strictEqual(isValidDataPoints([]), true);
      assert.strictEqual(isValidDataPoints(['point1', 'point2']), true);
      assert.strictEqual(isValidDataPoints(['Total calls: 5']), true);
    });

    test('should return false for invalid data points', () => {
      assert.strictEqual(isValidDataPoints(null), false);
      assert.strictEqual(isValidDataPoints(undefined), false);
      assert.strictEqual(isValidDataPoints('not an array'), false);
      assert.strictEqual(isValidDataPoints([1, 2, 3]), false);
      assert.strictEqual(isValidDataPoints(['valid', null]), false);
    });
  });

  suite('extractFunctionName', () => {
    test('should extract function names from Python function definitions', () => {
      assert.strictEqual(extractFunctionName('def function_name():'), 'function_name');
      assert.strictEqual(extractFunctionName('    def indented_function():'), 'indented_function');
      assert.strictEqual(extractFunctionName('def function_with_params(a, b):'), 'function_with_params');
      assert.strictEqual(extractFunctionName('def _private_function():'), '_private_function');
    });

    test('should return null for invalid function definitions', () => {
      assert.strictEqual(extractFunctionName('not a function'), null);
      assert.strictEqual(extractFunctionName('class ClassName:'), null);
      assert.strictEqual(extractFunctionName('def 123invalid():'), null);
      assert.strictEqual(extractFunctionName(''), null);
    });
  });

  suite('getModulePath', () => {
    test('should extract module path with root markers', () => {
      assert.strictEqual(getModulePath('/path/to/src/module/file.py'), 'src.module.file');
      assert.strictEqual(getModulePath('/path/to/app/module/file.py'), 'app.module.file');
      assert.strictEqual(getModulePath('/path/to/lib/module/file.py'), 'lib.module.file');
      assert.strictEqual(getModulePath('/path/to/tests/module/file.py'), 'tests.module.file');
    });

    test('should handle Windows-style paths', () => {
      assert.strictEqual(getModulePath('C:\\path\\to\\src\\module\\file.py'), 'src.module.file');
    });

    test('should handle files without root markers', () => {
      assert.strictEqual(getModulePath('/path/to/file.py'), 'file');
      assert.strictEqual(getModulePath('file.py'), 'file');
    });

    test('should handle nested paths with multiple root markers', () => {
      assert.strictEqual(getModulePath('/project/src/lib/module/file.py'), 'src.lib.module.file');
    });
  });

  suite('createCodeLensPath', () => {
    test('should create correct code lens path', () => {
      assert.strictEqual(createCodeLensPath('module.submodule', 'function_name'), 'module.submodule.function_name');
      assert.strictEqual(createCodeLensPath('module', 'function_name'), 'module.function_name');
    });
  });

  suite('createFunctionMatch', () => {
    test('should create function match for valid Python function', () => {
      const match = createFunctionMatch('/path/to/src/module/file.py', 'def test_function():');
      assert.ok(match);
      assert.strictEqual(match!.functionName, 'test_function');
      assert.strictEqual(match!.modulePath, 'src.module.file');
      assert.strictEqual(match!.codeLensPath, 'src.module.file.test_function');
    });

    test('should return null for non-function lines', () => {
      const match = createFunctionMatch('/path/to/file.py', 'class TestClass:');
      assert.strictEqual(match, null);
    });
  });

  suite('formatHoverTitle', () => {
    test('should return provided title', () => {
      assert.strictEqual(formatHoverTitle('Custom Title'), 'Custom Title');
      assert.strictEqual(formatHoverTitle('**Bold Title**'), '**Bold Title**');
    });

    test('should return default title when none provided', () => {
      assert.strictEqual(formatHoverTitle(), DEFAULT_HOVER_TITLE);
      assert.strictEqual(formatHoverTitle(undefined), DEFAULT_HOVER_TITLE);
    });
  });

  suite('formatDataPoint', () => {
    test('should format data points with bullet points', () => {
      assert.strictEqual(formatDataPoint('Total calls: 5'), '• Total calls: 5');
      assert.strictEqual(formatDataPoint('Function call info'), '• Function call info');
    });
  });

  suite('formatDataPoints', () => {
    test('should format all data points', () => {
      const input = ['Total calls: 5', 'Recent calls: 3'];
      const expected = ['• Total calls: 5', '• Recent calls: 3'];
      assert.deepStrictEqual(formatDataPoints(input), expected);
    });

    test('should handle empty array', () => {
      assert.deepStrictEqual(formatDataPoints([]), []);
    });
  });

  suite('createHoverContent', () => {
    test('should create formatted hover content', () => {
      const title = '**Function Calls**';
      const dataPoints = ['Total calls: 5', 'Recent calls: 3'];
      const expected = '**Function Calls**\n\n• Total calls: 5\n\n• Recent calls: 3';
      assert.strictEqual(createHoverContent(title, dataPoints), expected);
    });

    test('should handle empty data points', () => {
      const result = createHoverContent('**Title**', []);
      assert.strictEqual(result, '**Title**\n\n');
    });
  });

  suite('createHoverContentData', () => {
    test('should create hover content data with custom title', () => {
      const dataPoints = ['Total calls: 5'];
      const result = createHoverContentData(dataPoints, 'Custom Title');
      
      assert.strictEqual(result.title, 'Custom Title');
      assert.deepStrictEqual(result.dataPoints, ['Total calls: 5']);
    });

    test('should create hover content data with default title', () => {
      const dataPoints = ['Total calls: 5'];
      const result = createHoverContentData(dataPoints);
      
      assert.strictEqual(result.title, DEFAULT_HOVER_TITLE);
      assert.deepStrictEqual(result.dataPoints, ['Total calls: 5']);
    });

    test('should create immutable copy of data points', () => {
      const originalPoints = ['Total calls: 5'];
      const result = createHoverContentData(originalPoints);
      
      // Modify original array
      originalPoints.push('New point');
      
      // Result should be unaffected
      assert.strictEqual(result.dataPoints.length, 1);
    });
  });

  suite('createHoverError', () => {
    test('should create hover error with message', () => {
      const error = createHoverError('Test error');
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'Hover error: Test error');
    });

    test('should create hover error with context', () => {
      const error = createHoverError('Test error', 'parsing context');
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'Hover error in parsing context: Test error');
    });
  });

  suite('createValidationError', () => {
    test('should create validation error with message', () => {
      const error = createValidationError('Invalid input');
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'Invalid input');
    });

    test('should create validation error with field context', () => {
      const error = createValidationError('Invalid input', 'fieldName');
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, 'fieldName: Invalid input');
    });
  });

  suite('isHoverError', () => {
    test('should identify hover errors', () => {
      const hoverError = createHoverError('Test error');
      const validationError = createValidationError('Test validation');
      const genericError = new Error('Generic error');

      assert.strictEqual(isHoverError(hoverError), true);
      assert.strictEqual(isHoverError(validationError), false);
      assert.strictEqual(isHoverError(genericError), false);
      assert.strictEqual(isHoverError('not an error'), false);
    });
  });

  suite('isValidationError', () => {
    test('should identify validation errors', () => {
      const validationError = createValidationError('Test validation');
      const hoverError = createHoverError('Test error');
      const genericError = new Error('Generic error');

      assert.strictEqual(isValidationError(validationError), true);
      assert.strictEqual(isValidationError(hoverError), false);
      assert.strictEqual(isValidationError(genericError), true); // Generic errors are considered validation errors
      assert.strictEqual(isValidationError('not an error'), false);
    });
  });

  suite('Constants', () => {
    test('should have correct FUNCTION_REGEX', () => {
      assert.ok(FUNCTION_REGEX.test('def test_function():'));
      assert.ok(FUNCTION_REGEX.test('    def indented_function():'));
      assert.strictEqual(FUNCTION_REGEX.test('class TestClass:'), false);
    });

    test('should have correct ROOT_MARKERS', () => {
      assert.deepStrictEqual(ROOT_MARKERS, ['src', 'app', 'lib', 'tests']);
    });

    test('should have correct DEFAULT_HOVER_TITLE', () => {
      assert.strictEqual(DEFAULT_HOVER_TITLE, '**Function Calls**');
    });
  });
});