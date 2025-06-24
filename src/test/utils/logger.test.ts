import * as assert from 'assert';
import * as vscode from 'vscode';
import Logger, { LogLevel, LogWriter, createLogger, formatLogMessage, shouldLog, formatErrorMessage, createLogEntry } from '../../utils/logger';

suite('Logger Tests', () => {
  let mockOutputChannel: MockOutputChannel;
  let originalCreateOutputChannel: typeof vscode.window.createOutputChannel;

  class MockOutputChannel implements vscode.OutputChannel {
    name: string = 'ProdWatch';
    appendLineCalls: string[] = [];
    showCalled: boolean = false;
    disposeCalled: boolean = false;

    appendLine(value: string): void {
      this.appendLineCalls.push(value);
    }

    show(): void {
      this.showCalled = true;
    }

    dispose(): void {
      this.disposeCalled = true;
    }

    append(value: string): void { }
    clear(): void { }
    hide(): void { }
    replace(value: string): void { }
  }

  suiteSetup(() => {
    // Mock vscode.window.createOutputChannel
    originalCreateOutputChannel = vscode.window.createOutputChannel;
    vscode.window.createOutputChannel = (name: string, options?: any) => {
      mockOutputChannel = new MockOutputChannel();
      mockOutputChannel.name = name;
      return mockOutputChannel as any;
    };
  });

  suiteTeardown(() => {
    vscode.window.createOutputChannel = originalCreateOutputChannel;
  });

  setup(() => {
    mockOutputChannel = new MockOutputChannel();
    // Reset log level to default for each test
    Logger.setLogLevel(LogLevel.INFO);
  });

  teardown(() => {
    Logger.dispose();
  });

  suite('Logger.initialize()', () => {
    test('should initialize output channel', () => {
      Logger.initialize();
      
      assert.strictEqual(mockOutputChannel.name, 'ProdWatch');
    });
  });

  suite('Logger.dispose()', () => {
    test('should dispose output channel', () => {
      Logger.initialize();
      Logger.dispose();
      
      assert.strictEqual(mockOutputChannel.disposeCalled, true);
    });

    test('should handle dispose when output channel is not initialized', () => {
      // Should not throw error
      Logger.dispose();
      
      // No assertion needed - just ensuring no error is thrown
    });
  });

  suite('Logger.setLogLevel()', () => {
    test('should set log level correctly', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      
      Logger.debug('debug message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[DEBUG] debug message'));
    });

    test('should filter messages below current log level', () => {
      Logger.setLogLevel(LogLevel.WARN);
      Logger.initialize();
      
      Logger.debug('debug message');
      Logger.info('info message');
      Logger.warn('warn message');
      Logger.error('error message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 2);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[WARN] warn message'));
      assert.ok(mockOutputChannel.appendLineCalls[1].includes('[ERROR] error message'));
    });

    test('should default to INFO log level', () => {
      Logger.initialize();
      
      Logger.debug('debug message');
      Logger.info('info message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[INFO] info message'));
    });
  });

  suite('Logger.debug()', () => {
    test('should format debug messages correctly', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      
      Logger.debug('debug test');
      
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[DEBUG] debug test'));
    });

    test('should not log when output channel is not initialized', () => {
      Logger.debug('test message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 0);
    });

    test('should handle empty message strings', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      
      Logger.debug('');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[DEBUG] '));
    });

    test('should handle null/undefined message strings', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      
      Logger.debug(null as any);
      Logger.debug(undefined as any);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 2);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[DEBUG] null'));
      assert.ok(mockOutputChannel.appendLineCalls[1].includes('[DEBUG] undefined'));
    });

    test('should handle messages with special characters', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      
      Logger.debug('Message with\nnewlines\tand\ttabs');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[DEBUG] Message with\nnewlines\tand\ttabs'));
    });

    test('should handle very long messages', () => {
      Logger.setLogLevel(LogLevel.DEBUG);
      Logger.initialize();
      const longMessage = 'A'.repeat(10000);
      
      Logger.debug(longMessage);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes(longMessage));
    });
  });

  suite('Logger.info()', () => {
    test('should format messages with timestamps correctly', () => {
      Logger.initialize();
      
      Logger.info('test message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      const message = mockOutputChannel.appendLineCalls[0];
      assert.ok(message.match(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] test message$/));
    });

    test('should not log when output channel is not initialized', () => {
      Logger.info('test message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 0);
    });

    test('should handle empty message strings', () => {
      Logger.initialize();
      
      Logger.info('');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[INFO] '));
    });

    test('should handle null/undefined message strings', () => {
      Logger.initialize();
      
      Logger.info(null as any);
      Logger.info(undefined as any);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 2);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[INFO] null'));
      assert.ok(mockOutputChannel.appendLineCalls[1].includes('[INFO] undefined'));
    });

    test('should handle messages with special characters', () => {
      Logger.initialize();
      
      Logger.info('Message with\nnewlines\tand\ttabs');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[INFO] Message with\nnewlines\tand\ttabs'));
    });

    test('should handle very long messages', () => {
      Logger.initialize();
      const longMessage = 'A'.repeat(10000);
      
      Logger.info(longMessage);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes(longMessage));
    });
  });

  suite('Logger.warn()', () => {
    test('should format warning messages correctly', () => {
      Logger.initialize();
      
      Logger.warn('warning test');
      
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[WARN] warning test'));
    });
  });

  suite('Logger.error()', () => {
    test('should log error messages without Error object', () => {
      Logger.initialize();
      
      Logger.error('error message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[ERROR] error message'));
    });

    test('should log error messages with Error object', () => {
      Logger.initialize();
      const error = new Error('test error');
      
      Logger.error('error message', error);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 2);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[ERROR] error message - test error'));
      assert.ok(mockOutputChannel.appendLineCalls[1].includes('[ERROR] Stack trace:'));
    });

    test('should log stack trace for Error objects', () => {
      Logger.initialize();
      const error = new Error('test error');
      error.stack = 'Error: test error\n    at test.js:1:1';
      
      Logger.error('error message', error);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 2);
      assert.ok(mockOutputChannel.appendLineCalls[1].includes('[ERROR] Stack trace: Error: test error'));
    });

    test('should handle Error object without stack trace', () => {
      Logger.initialize();
      const error = new Error('test error');
      error.stack = undefined;
      
      Logger.error('error message', error);
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[ERROR] error message - test error'));
    });
  });

  suite('Logger.log()', () => {
    test('should use log() as alias for info()', () => {
      Logger.initialize();
      
      Logger.log('test message');
      
      assert.strictEqual(mockOutputChannel.appendLineCalls.length, 1);
      assert.ok(mockOutputChannel.appendLineCalls[0].includes('[INFO] test message'));
    });
  });

  suite('Logger.show()', () => {
    test('should show output channel', () => {
      Logger.initialize();
      
      Logger.show();
      
      assert.strictEqual(mockOutputChannel.showCalled, true);
    });

    test('should handle show when output channel is not initialized', () => {
      // Should not throw error
      Logger.show();
      
      // No assertion needed - just ensuring no error is thrown
    });
  });
});

suite('formatLogMessage()', () => {
  test('should format message with timestamp and level', () => {
    const timestamp = new Date('2023-01-01T12:00:00.000Z');
    const result = formatLogMessage('INFO', 'test message', timestamp);
    
    assert.strictEqual(result, '[2023-01-01T12:00:00.000Z] [INFO] test message');
  });

  test('should handle empty message', () => {
    const timestamp = new Date('2023-01-01T12:00:00.000Z');
    const result = formatLogMessage('DEBUG', '', timestamp);
    
    assert.strictEqual(result, '[2023-01-01T12:00:00.000Z] [DEBUG] ');
  });

  test('should handle special characters in message', () => {
    const timestamp = new Date('2023-01-01T12:00:00.000Z');
    const result = formatLogMessage('ERROR', 'message\nwith\ttabs', timestamp);
    
    assert.strictEqual(result, '[2023-01-01T12:00:00.000Z] [ERROR] message\nwith\ttabs');
  });
});

suite('shouldLog()', () => {
  test('should return true when message level >= current level', () => {
    assert.strictEqual(shouldLog(LogLevel.ERROR, LogLevel.INFO), true);
    assert.strictEqual(shouldLog(LogLevel.WARN, LogLevel.WARN), true);
    assert.strictEqual(shouldLog(LogLevel.INFO, LogLevel.DEBUG), true);
  });

  test('should return false when message level < current level', () => {
    assert.strictEqual(shouldLog(LogLevel.DEBUG, LogLevel.INFO), false);
    assert.strictEqual(shouldLog(LogLevel.INFO, LogLevel.WARN), false);
    assert.strictEqual(shouldLog(LogLevel.WARN, LogLevel.ERROR), false);
  });
});

suite('formatErrorMessage()', () => {
  test('should return message when no error provided', () => {
    const result = formatErrorMessage('test message');
    
    assert.strictEqual(result, 'test message');
  });

  test('should append error message when error provided', () => {
    const error = new Error('test error');
    const result = formatErrorMessage('test message', error);
    
    assert.strictEqual(result, 'test message - test error');
  });

  test('should handle error with empty message', () => {
    const error = new Error('');
    const result = formatErrorMessage('test message', error);
    
    assert.strictEqual(result, 'test message - ');
  });
});

suite('createLogEntry()', () => {
  test('should return empty array when level is below threshold', () => {
    const result = createLogEntry(LogLevel.DEBUG, 'DEBUG', 'test', LogLevel.INFO);
    
    assert.deepStrictEqual(result, []);
  });

  test('should return formatted entry when level meets threshold', () => {
    const result = createLogEntry(LogLevel.INFO, 'INFO', 'test message', LogLevel.INFO);
    
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes('[INFO] test message'));
  });

  test('should include stack trace for errors with stack', () => {
    const error = new Error('test error');
    error.stack = 'Error: test error\n    at test.js:1:1';
    const result = createLogEntry(LogLevel.ERROR, 'ERROR', 'test', LogLevel.ERROR, error);
    
    assert.strictEqual(result.length, 2);
    assert.ok(result[0].includes('[ERROR] test - test error'));
    assert.ok(result[1].includes('[ERROR] Stack trace: Error: test error'));
  });

  test('should not include stack trace for errors without stack', () => {
    const error = new Error('test error');
    error.stack = undefined;
    const result = createLogEntry(LogLevel.ERROR, 'ERROR', 'test', LogLevel.ERROR, error);
    
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes('[ERROR] test - test error'));
  });
});

suite('createLogger()', () => {
  const createTestWriter = (): LogWriter & { getMessages: () => string[] } => {
    const messages: string[] = [];
    return {
      appendLine: (message: string) => {
        messages.push(message);
      },
      getMessages: () => [...messages]
    };
  };

  test('should create logger with default INFO level', () => {
    const writer = createTestWriter();
    const logger = createLogger(writer);
    
    logger.debug('debug message');
    logger.info('info message');
    
    const messages = writer.getMessages();
    assert.strictEqual(messages.length, 1);
    assert.ok(messages[0].includes('[INFO] info message'));
  });

  test('should create logger with custom level', () => {
    const writer = createTestWriter();
    const logger = createLogger(writer, LogLevel.DEBUG);
    
    logger.debug('debug message');
    logger.info('info message');
    
    const messages = writer.getMessages();
    assert.strictEqual(messages.length, 2);
    assert.ok(messages[0].includes('[DEBUG] debug message'));
    assert.ok(messages[1].includes('[INFO] info message'));
  });

  test('should allow changing log level', () => {
    const writer = createTestWriter();
    const logger = createLogger(writer, LogLevel.ERROR);
    
    logger.info('should not appear');
    logger.setLogLevel(LogLevel.INFO);
    logger.info('should appear');
    
    const messages = writer.getMessages();
    assert.strictEqual(messages.length, 1);
    assert.ok(messages[0].includes('[INFO] should appear'));
  });

  test('should handle error logging with stack traces', () => {
    const writer = createTestWriter();
    const logger = createLogger(writer);
    const error = new Error('test error');
    error.stack = 'Error: test error\n    at test.js:1:1';
    
    logger.error('error occurred', error);
    
    const messages = writer.getMessages();
    assert.strictEqual(messages.length, 2);
    assert.ok(messages[0].includes('[ERROR] error occurred - test error'));
    assert.ok(messages[1].includes('[ERROR] Stack trace: Error: test error'));
  });

  test('should treat log() as alias for info()', () => {
    const writer = createTestWriter();
    const logger = createLogger(writer);
    
    logger.log('test message');
    
    const messages = writer.getMessages();
    assert.strictEqual(messages.length, 1);
    assert.ok(messages[0].includes('[INFO] test message'));
  });

  test('should maintain independent state between instances', () => {
    const writer1 = createTestWriter();
    const writer2 = createTestWriter();
    const logger1 = createLogger(writer1, LogLevel.DEBUG);
    const logger2 = createLogger(writer2, LogLevel.WARN);
    
    logger1.debug('debug from logger1');
    logger2.debug('debug from logger2');
    logger1.warn('warn from logger1');
    logger2.warn('warn from logger2');
    
    const messages1 = writer1.getMessages();
    const messages2 = writer2.getMessages();
    
    assert.strictEqual(messages1.length, 2);
    assert.strictEqual(messages2.length, 1);
    assert.ok(messages1[0].includes('debug from logger1'));
    assert.ok(messages1[1].includes('warn from logger1'));
    assert.ok(messages2[0].includes('warn from logger2'));
  });

  test('should capture log output functionally', () => {
    const captureOutput = (logAction: (logger: ReturnType<typeof createLogger>) => void) => {
      const writer = createTestWriter();
      const logger = createLogger(writer);
      logAction(logger);
      return writer.getMessages();
    };
    
    const output1 = captureOutput(logger => logger.info('test 1'));
    const output2 = captureOutput(logger => logger.warn('test 2'));
    
    assert.strictEqual(output1.length, 1);
    assert.strictEqual(output2.length, 1);
    assert.ok(output1[0].includes('[INFO] test 1'));
    assert.ok(output2[0].includes('[WARN] test 2'));
  });

  test('should test log filtering functionally', () => {
    const testLogFiltering = (level: LogLevel, messages: { level: LogLevel, text: string }[]) => {
      const writer = createTestWriter();
      const logger = createLogger(writer, level);
      
      messages.forEach(msg => {
        switch (msg.level) {
          case LogLevel.DEBUG: logger.debug(msg.text); break;
          case LogLevel.INFO: logger.info(msg.text); break;
          case LogLevel.WARN: logger.warn(msg.text); break;
          case LogLevel.ERROR: logger.error(msg.text); break;
        }
      });
      
      return writer.getMessages();
    };
    
    const testMessages = [
      { level: LogLevel.DEBUG, text: 'debug msg' },
      { level: LogLevel.INFO, text: 'info msg' },
      { level: LogLevel.WARN, text: 'warn msg' },
      { level: LogLevel.ERROR, text: 'error msg' }
    ];
    
    const warnOutput = testLogFiltering(LogLevel.WARN, testMessages);
    assert.strictEqual(warnOutput.length, 2);
    assert.ok(warnOutput[0].includes('[WARN] warn msg'));
    assert.ok(warnOutput[1].includes('[ERROR] error msg'));
  });
});

suite('LogLevel', () => {
  test('should have correct LogLevel values', () => {
    assert.strictEqual(LogLevel.DEBUG, 0);
    assert.strictEqual(LogLevel.INFO, 1);
    assert.strictEqual(LogLevel.WARN, 2);
    assert.strictEqual(LogLevel.ERROR, 3);
  });

  test('should properly compare LogLevel values', () => {
    assert.strictEqual(LogLevel.DEBUG < LogLevel.INFO, true);
    assert.strictEqual(LogLevel.INFO < LogLevel.WARN, true);
    assert.strictEqual(LogLevel.WARN < LogLevel.ERROR, true);
    assert.strictEqual(LogLevel.ERROR >= LogLevel.ERROR, true);
  });
});