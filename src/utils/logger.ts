import * as vscode from 'vscode';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogWriter {
  appendLine(message: string): void;
}

const createLogger = (writer: LogWriter, initialLevel: LogLevel = LogLevel.INFO) => {
  let currentLevel = initialLevel;

  const writeEntries = (entries: string[]) => {
    entries.forEach(entry => writer.appendLine(entry));
  };

  return {
    setLogLevel: (level: LogLevel) => {
      currentLevel = level;
    },
    debug: (message: string) => {
      const entries = createLogEntry(LogLevel.DEBUG, 'DEBUG', message, currentLevel);
      writeEntries(entries);
    },
    info: (message: string) => {
      const entries = createLogEntry(LogLevel.INFO, 'INFO', message, currentLevel);
      writeEntries(entries);
    },
    warn: (message: string) => {
      const entries = createLogEntry(LogLevel.WARN, 'WARN', message, currentLevel);
      writeEntries(entries);
    },
    error: (message: string, error?: Error) => {
      const entries = createLogEntry(LogLevel.ERROR, 'ERROR', message, currentLevel, error);
      writeEntries(entries);
    },
    log: (message: string) => {
      const entries = createLogEntry(LogLevel.INFO, 'INFO', message, currentLevel);
      writeEntries(entries);
    }
  };
};

const formatLogMessage = (level: string, message: string, timestamp: Date = new Date()): string => {
  return `[${timestamp.toISOString()}] [${level}] ${message}`;
};

const shouldLog = (messageLevel: LogLevel, currentLevel: LogLevel): boolean => {
  return messageLevel >= currentLevel;
};

const formatErrorMessage = (message: string, error?: Error): string => {
  return error ? `${message} - ${error.message}` : message;
};

const createLogEntry = (level: LogLevel, levelName: string, message: string, currentLevel: LogLevel, error?: Error): string[] => {
  if (!shouldLog(level, currentLevel)) {
    return [];
  }

  const entries = [formatLogMessage(levelName, formatErrorMessage(message, error))];

  if (error && error.stack) {
    entries.push(formatLogMessage(levelName, `Stack trace: ${error.stack}`));
  }

  return entries;
};

class Logger {
  private static outputChannel: vscode.OutputChannel;
  private static currentLogLevel: LogLevel = LogLevel.INFO;

  static initialize() {
    this.outputChannel = vscode.window.createOutputChannel('ProdWatch');
  }

  static setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private static writeLog(level: LogLevel, levelName: string, message: string, error?: Error) {
    if (this.outputChannel) {
      const entries = createLogEntry(level, levelName, message, this.currentLogLevel, error);
      entries.forEach(entry => this.outputChannel.appendLine(entry));
    }
  }

  static debug(message: string) {
    this.writeLog(LogLevel.DEBUG, 'DEBUG', message);
  }

  static log(message: string) {
    this.info(message);
  }

  static info(message: string) {
    this.writeLog(LogLevel.INFO, 'INFO', message);
  }

  static warn(message: string) {
    this.writeLog(LogLevel.WARN, 'WARN', message);
  }

  static error(message: string, error?: Error) {
    this.writeLog(LogLevel.ERROR, 'ERROR', message, error);
  }

  static show() {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  static dispose() {
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
  }
}

export default Logger;
export { LogLevel, LogWriter, createLogger, formatLogMessage, shouldLog, formatErrorMessage, createLogEntry }; 