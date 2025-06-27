import * as vscode from 'vscode';

/**
 * Mock VS Code TextDocument for testing
 * Use this for testing document parsing, line access, etc.
 */
export class MockTextDocument implements vscode.TextDocument {
  public eol: vscode.EndOfLine = vscode.EndOfLine.LF;

  constructor(
    public uri: vscode.Uri,
    public fileName: string,
    public isUntitled: boolean = false,
    public languageId: string = 'python',
    public version: number = 1,
    public isDirty: boolean = false,
    public isClosed: boolean = false,
    private lines: string[] = []
  ) {}

  save(): Thenable<boolean> {
    return Promise.resolve(true);
  }

  get lineCount(): number {
    return this.lines.length;
  }

  lineAt(line: number): vscode.TextLine;
  lineAt(position: vscode.Position): vscode.TextLine;
  lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
    const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
    const text = this.lines[lineNum] || '';
    
    return {
      lineNumber: lineNum,
      text,
      range: new vscode.Range(lineNum, 0, lineNum, text.length),
      rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum + 1, 0),
      firstNonWhitespaceCharacterIndex: text.search(/\S/),
      isEmptyOrWhitespace: text.trim().length === 0
    };
  }

  offsetAt(position: vscode.Position): number { return 0; }
  positionAt(offset: number): vscode.Position { return new vscode.Position(0, 0); }
  getText(range?: vscode.Range): string { return this.lines.join('\n'); }
  getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined { return undefined; }
  validateRange(range: vscode.Range): vscode.Range { return range; }
  validatePosition(position: vscode.Position): vscode.Position { return position; }

  // Helper method for tests
  setLines(lines: string[]): void {
    this.lines = lines;
  }

  // Helper method to create typical Python file
  static createPythonFile(filePath: string, lines: string[]): MockTextDocument {
    const doc = new MockTextDocument(
      vscode.Uri.file(filePath),
      filePath.split('/').pop() || 'file.py',
      false,
      'python'
    );
    doc.setLines(lines);
    return doc;
  }

  // Helper method to create non-Python file
  static createTextFile(filePath: string, lines: string[]): MockTextDocument {
    const doc = new MockTextDocument(
      vscode.Uri.file(filePath),
      filePath.split('/').pop() || 'file.txt',
      false,
      'text'
    );
    doc.setLines(lines);
    return doc;
  }
}