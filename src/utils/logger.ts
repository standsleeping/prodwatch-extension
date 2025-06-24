import * as vscode from 'vscode';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private static outputChannel: vscode.OutputChannel;
  private static currentLogLevel: LogLevel = LogLevel.INFO;

  static initialize() {
    this.outputChannel = vscode.window.createOutputChannel('ProdWatch');
  }

  static setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  private static formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private static writeLog(level: LogLevel, levelName: string, message: string) {
    if (level >= this.currentLogLevel && this.outputChannel) {
      this.outputChannel.appendLine(this.formatMessage(levelName, message));
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
    const errorDetails = error ? ` - ${error.message}` : '';
    this.writeLog(LogLevel.ERROR, 'ERROR', `${message}${errorDetails}`);
    
    // Also log stack trace for errors if available
    if (error && error.stack) {
      this.writeLog(LogLevel.ERROR, 'ERROR', `Stack trace: ${error.stack}`);
    }
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
export { LogLevel }; 