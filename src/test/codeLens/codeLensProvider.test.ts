import * as assert from 'assert';
import { PythonCodeLensProvider } from '../../codeLens/codeLensProvider';
import { FunctionDataService } from '../../data/functionDataService';
import Logger from '../../utils/logger';


class TestableCodeLensProvider extends PythonCodeLensProvider {
  public testGetModulePath(filePath: string): string {
    return this.getModulePath(filePath);
  }
}

suite('PythonCodeLensProvider Tests', () => {
  let provider: TestableCodeLensProvider;
  let originalLog: typeof Logger.log;

  suiteSetup(() => {
    originalLog = Logger.log;
    Logger.log = () => { };
  });

  suiteTeardown(() => {
    Logger.log = originalLog;
  });

  setup(() => {
    // Create a mock FunctionDataService for testing
    const mockFunctionDataService = {} as FunctionDataService;
    provider = new TestableCodeLensProvider(mockFunctionDataService);
  });

  suite('getModulePath', () => {
    test('should handle basic src path', () => {
      const result = provider.testGetModulePath('/project/src/module.py');
      assert.strictEqual(result, 'src.module');
    });

    test('should handle nested path', () => {
      const result = provider.testGetModulePath('/project/src/api/handlers/user.py');
      assert.strictEqual(result, 'src.api.handlers.user');
    });

    test('should handle app root marker', () => {
      const result = provider.testGetModulePath('/project/app/services/auth.py');
      assert.strictEqual(result, 'app.services.auth');
    });

    test('should handle file with no root marker', () => {
      const result = provider.testGetModulePath('/project/random/file.py');
      assert.strictEqual(result, 'file');
    });

    test('should handle Windows-style paths', () => {
      const result = provider.testGetModulePath('C:\\project\\src\\module.py');
      assert.strictEqual(result, 'src.module');
    });

    test('should handle lib root marker', () => {
      const result = provider.testGetModulePath('/project/lib/utils/helper.py');
      assert.strictEqual(result, 'lib.utils.helper');
    });
  });

  suite('onDidChangeCodeLenses', () => {
    test('should expose onDidChangeCodeLenses event', () => {
      const mockService = {} as FunctionDataService;
      const provider = new PythonCodeLensProvider(mockService);
      
      assert.ok(provider.onDidChangeCodeLenses);
      assert.strictEqual(typeof provider.onDidChangeCodeLenses, 'function');
    });

    test('should fire event when refresh() is called', () => {
      const mockService = {} as FunctionDataService;
      const provider = new PythonCodeLensProvider(mockService);
      
      let eventFired = false;
      provider.onDidChangeCodeLenses(() => {
        eventFired = true;
      });
      
      provider.refresh();
      
      assert.strictEqual(eventFired, true);
    });

    test('should support multiple event listeners', () => {
      const mockService = {} as FunctionDataService;
      const provider = new PythonCodeLensProvider(mockService);
      
      let listener1Called = false;
      let listener2Called = false;
      
      provider.onDidChangeCodeLenses(() => {
        listener1Called = true;
      });
      
      provider.onDidChangeCodeLenses(() => {
        listener2Called = true;
      });
      
      provider.refresh();
      
      assert.strictEqual(listener1Called, true);
      assert.strictEqual(listener2Called, true);
    });
  });
}); 