import * as vscode from 'vscode';

class Logger {
  private static outputChannel: vscode.OutputChannel;

  static initialize() {
    this.outputChannel = vscode.window.createOutputChannel('ProdWatch');
  }

  static log(message: string) {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  static show() {
    this.outputChannel.show();
  }
}

export default Logger; 