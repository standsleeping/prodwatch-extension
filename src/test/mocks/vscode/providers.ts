import * as vscode from 'vscode';

/**
 * Mock VS Code MarkdownString for testing
 * Use this for testing hover content generation
 */
export class MockMarkdownString implements vscode.MarkdownString {
  public value: string = '';
  public isTrusted?: boolean;
  public supportThemeIcons?: boolean;
  public supportHtml?: boolean;

  constructor(value?: string, supportThemeIcons?: boolean) {
    this.value = value || '';
    this.supportThemeIcons = supportThemeIcons;
  }

  appendText(value: string): vscode.MarkdownString {
    this.value += value;
    return this;
  }

  appendMarkdown(value: string): vscode.MarkdownString {
    this.value += value;
    return this;
  }

  appendCodeblock(value: string, language?: string): vscode.MarkdownString {
    this.value += `\n\`\`\`${language || ''}\n${value}\n\`\`\`\n`;
    return this;
  }

  // Helper methods for testing
  static create(initialValue?: string): MockMarkdownString {
    return new MockMarkdownString(initialValue);
  }

  getContent(): string {
    return this.value;
  }

  clear(): void {
    this.value = '';
  }
}

/**
 * Mock VS Code Hover for testing
 * Use this for testing hover result creation
 */
export class MockHover implements vscode.Hover {
  constructor(
    public contents: Array<vscode.MarkdownString | vscode.MarkedString>,
    public range?: vscode.Range
  ) { }

  // Handle single content input
  static createWithContent(
    content: vscode.MarkdownString | vscode.MarkedString | Array<vscode.MarkdownString | vscode.MarkedString>,
    range?: vscode.Range
  ): MockHover {
    const contents = Array.isArray(content) ? content : [content];
    return new MockHover(contents, range);
  }

  // Helper factory methods
  static createWithMarkdown(content: string, range?: vscode.Range): MockHover {
    const markdown = new MockMarkdownString(content);
    return new MockHover([markdown], range);
  }

  static createWithMultipleContents(contents: string[], range?: vscode.Range): MockHover {
    const markdownContents = contents.map(content => new MockMarkdownString(content));
    return new MockHover(markdownContents, range);
  }

  // Helper methods for testing
  getFirstContent(): string {
    const first = this.contents[0];
    return first instanceof MockMarkdownString ? first.value : String(first);
  }

  getAllContents(): string[] {
    return this.contents.map(content =>
      content instanceof MockMarkdownString ? content.value : String(content)
    );
  }
}

/**
 * Mock VS Code CodeLens for testing
 * Use this for testing code lens provider functionality
 */
export class MockCodeLens implements vscode.CodeLens {
  constructor(
    public range: vscode.Range,
    public command?: vscode.Command
  ) { }

  get isResolved(): boolean {
    return this.command !== undefined;
  }

  // Helper factory methods
  static create(line: number, character: number, length: number, command?: vscode.Command): MockCodeLens {
    const range = new vscode.Range(line, character, line, character + length);
    return new MockCodeLens(range, command);
  }

  static createWithCommand(
    line: number,
    character: number,
    length: number,
    title: string,
    commandId: string,
    args?: any[]
  ): MockCodeLens {
    const range = new vscode.Range(line, character, line, character + length);
    const command: vscode.Command = {
      title,
      command: commandId,
      arguments: args
    };
    return new MockCodeLens(range, command);
  }
}

/**
 * Factory class for creating VS Code UI mocks
 * Use this for consistent mock creation across tests
 */
export class VSCodeProviderMocks {
  static createMarkdownString(content?: string): MockMarkdownString {
    return MockMarkdownString.create(content);
  }

  static createHover(content: string, range?: vscode.Range): MockHover {
    return MockHover.createWithMarkdown(content, range);
  }

  static createCodeLens(line: number, char: number, length: number): MockCodeLens {
    return MockCodeLens.create(line, char, length);
  }

  static createCodeLensWithCommand(
    line: number,
    char: number,
    length: number,
    title: string,
    commandId: string
  ): MockCodeLens {
    return MockCodeLens.createWithCommand(line, char, length, title, commandId);
  }
}