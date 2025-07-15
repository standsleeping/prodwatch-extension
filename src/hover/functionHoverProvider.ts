import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { FunctionDataService } from '../data/functionDataService';
import { WatchStatus } from '../api/apiService';
import {
  provideHoverOperation,
  HoverDataProvider,
  VSCodeHover,
  VSCodeMarkdownString,
  VSCodeHoverResult
} from './hoverOperations';

// VS Code hover factory implementation
class VSCodeHoverFactory implements VSCodeHover {
  createMarkdownString(): VSCodeMarkdownString {
    const markdownString = new vscode.MarkdownString();
    return {
      appendMarkdown: (content: string) => markdownString.appendMarkdown(content)
    };
  }

  createHover(content: VSCodeMarkdownString): VSCodeHoverResult {
    // We need to get the actual MarkdownString from our wrapper
    const actualMarkdownString = new vscode.MarkdownString();
    return new vscode.Hover(actualMarkdownString) as unknown as VSCodeHoverResult;
  }
}

// Adapter to make FunctionDataService compatible with HoverDataProvider
class FunctionDataServiceAdapter implements HoverDataProvider {
  constructor(private dataService: FunctionDataService) {}

  getFunctionData(codeLensPath: string) {
    return this.dataService.getFunctionData(codeLensPath);
  }

  getDefaultPlaceholderData(): string[] {
    return this.dataService.getDefaultPlaceholderData();
  }
}

export class FunctionHoverProvider implements vscode.HoverProvider {
  private dataProvider: HoverDataProvider;
  private hoverFactory: VSCodeHover;

  constructor(
    private context: vscode.ExtensionContext,
    private dataService: FunctionDataService
  ) {
    this.dataProvider = new FunctionDataServiceAdapter(dataService);
    this.hoverFactory = new VSCodeHoverFactory();
    Logger.log('FunctionHoverProvider initialized');
  }

  private getWatchStatusText(watchStatus: WatchStatus): string {
    switch (watchStatus) {
      case WatchStatus.ACTIVE:
        return '**Watch Status:** Active';
      case WatchStatus.PENDING:
        return '**Watch Status:** Pending';
      case WatchStatus.FAILED:
        return '**Watch Status:** Failed';
      case WatchStatus.MIXED_STATES:
        return '**Watch Status:** Mixed States';
      case WatchStatus.NOT_REQUESTED:
      default:
        return '**Watch Status:** Not Requested';
    }
  }

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const result = provideHoverOperation(
      document,
      position,
      this.dataProvider,
      this.hoverFactory
    );

    if (!result.success) {
      Logger.warn(`Hover operation failed: ${result.error.message}`);
      return null;
    }

    if (result.data === null) {
      // No function found at position
      return null;
    }

    // Extract the function match and create proper hover content
    const line = document.lineAt(position.line);
    const functionMatch = line.text.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);

    if (functionMatch) {
      const functionName = functionMatch[1];
      const pathWithoutExt = document.uri.fsPath.replace(/\.py$/, '');
      const parts = pathWithoutExt.split(/[/\\]/);
      const rootMarkers = ['src', 'app', 'lib', 'tests'];
      const rootIndex = parts.findIndex(part => rootMarkers.includes(part));
      const modulePath = rootIndex === -1 ? parts[parts.length - 1] : parts.slice(rootIndex).join('.');
      const codeLensPath = `${modulePath}.${functionName}`;

      Logger.log(`Hover on function: ${codeLensPath}`);

      const functionData = this.dataService.getFunctionData(codeLensPath);
      const dataPoints = functionData ? functionData.dataPoints : this.dataService.getDefaultPlaceholderData();

      Logger.log(`Function data found: ${functionData ? 'YES' : 'NO'}`);

      const hoverContent = new vscode.MarkdownString();
      hoverContent.isTrusted = true; // Enable command URIs
      hoverContent.appendMarkdown('**Function Calls**\n\n');

      dataPoints.forEach(point => {
        hoverContent.appendMarkdown(`• ${point}\n\n`);
      });

      // Add watch status
      const watchStatus = functionData?.callData?.watch_status || WatchStatus.NOT_REQUESTED;
      const watchStatusText = this.getWatchStatusText(watchStatus);
      hoverContent.appendMarkdown(`${watchStatusText}\n\n`);

      // Add watch button
      const watchUri = vscode.Uri.parse(`command:prodwatch.watchFunction?${encodeURIComponent(JSON.stringify([functionName, codeLensPath]))}`);
      hoverContent.appendMarkdown(`\n[Watch Function](${watchUri})\n`);

      return new vscode.Hover(hoverContent);
    }

    return null;
  }
} 