import * as vscode from 'vscode';
import Logger from '../utils/logger';
import { FunctionDataService } from '../data/functionDataService';

export class FunctionHoverProvider implements vscode.HoverProvider {
    private functionRegex: RegExp;

    constructor(
        private context: vscode.ExtensionContext,
        private dataService: FunctionDataService
    ) {
        // Match Python function definitions
        this.functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
        Logger.log('FunctionHoverProvider initialized');
    }

    private getModulePath(filePath: string): string {
        // Use the same logic as CodeLensProvider
        const pathWithoutExt = filePath.replace(/\.py$/, '');
        const parts = pathWithoutExt.split(/[/\\]/);

        const rootMarkers = ['src', 'app', 'lib', 'tests'];
        const rootIndex = parts.findIndex(part => rootMarkers.includes(part));

        if (rootIndex === -1) {
            return parts[parts.length - 1];
        }

        return parts.slice(rootIndex).join('.');
    }

    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        const line = document.lineAt(position.line);
        const functionMatch = line.text.match(this.functionRegex);

        if (functionMatch) {
            const functionName = functionMatch[1];
            const modulePath = this.getModulePath(document.uri.fsPath);
            const codeLensPath = `${modulePath}.${functionName}`;

            Logger.log(`Hover on function: ${codeLensPath}`);
            Logger.log(`File path: ${document.uri.fsPath}`);
            Logger.log(`Module path: ${modulePath}`);
            Logger.log(`Function name: ${functionName}`);

            // Get function data from the service using exact CodeLens path
            const functionData = this.dataService.getFunctionData(codeLensPath);
            const dataPoints = functionData ? functionData.dataPoints : this.dataService.getDefaultPlaceholderData();

            Logger.log(`Function data found: ${functionData ? 'YES' : 'NO'}`);
            Logger.log(`Data points: ${JSON.stringify(dataPoints)}`);

            // Create hover content with real or placeholder data
            const hoverContent = new vscode.MarkdownString();
            hoverContent.appendMarkdown('**Function Data:**\n\n');

            dataPoints.forEach(point => {
                hoverContent.appendMarkdown(`• ${point}\n`);
            });

            return new vscode.Hover(hoverContent);
        }

        return null;
    }
} 