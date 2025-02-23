import * as assert from 'assert';
import { PythonCodeLensProvider } from '../../codeLens/codeLensProvider';
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
    provider = new TestableCodeLensProvider();
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
}); 