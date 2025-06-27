import * as vscode from 'vscode';
import {
  HoverContext,
  FunctionMatch,
  HoverContentData,
  isValidHoverContext,
  isValidDataPoints,
  createFunctionMatch,
  createHoverContentData,
  createHoverError,
  createValidationError
} from './hoverCore';
import { FunctionData } from '../data/functionDataCore';

/**
 * Result types for explicit error handling
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Interface for hover data dependencies
 */
export interface HoverDataProvider {
  getFunctionData(codeLensPath: string): FunctionData | null;
  getDefaultPlaceholderData(): string[];
}

/**
 * Interface for VS Code hover abstraction
 */
export interface VSCodeHover {
  createMarkdownString(): VSCodeMarkdownString;
  createHover(content: VSCodeMarkdownString): VSCodeHoverResult;
}

export interface VSCodeMarkdownString {
  appendMarkdown(content: string): void;
}

export interface VSCodeHoverResult {
  // Placeholder for VS Code Hover type
}

/**
 * Pure business logic operations with Result types
 */

/**
 * Safely parse hover context from document and position
 */
export const parseHoverContextOperation = (
  document: vscode.TextDocument,
  position: vscode.Position
): Result<HoverContext> => {
  try {
    const line = document.lineAt(position.line);
    const context: HoverContext = {
      filePath: document.uri.fsPath,
      lineText: line.text,
      position: position.character
    };

    if (!isValidHoverContext(context)) {
      return {
        success: false,
        error: createValidationError('Invalid hover context')
      };
    }

    return {
      success: true,
      data: context
    };
  } catch (error) {
    return {
      success: false,
      error: createHoverError(
        error instanceof Error ? error.message : String(error),
        'parsing hover context'
      )
    };
  }
};

/**
 * Safely extract function match from hover context
 */
export const extractFunctionMatchOperation = (
  context: HoverContext
): Result<FunctionMatch | null> => {
  if (!isValidHoverContext(context)) {
    return {
      success: false,
      error: createValidationError('Invalid hover context', 'context')
    };
  }

  try {
    const functionMatch = createFunctionMatch(context.filePath, context.lineText);
    return {
      success: true,
      data: functionMatch
    };
  } catch (error) {
    return {
      success: false,
      error: createHoverError(
        error instanceof Error ? error.message : String(error),
        'extracting function match'
      )
    };
  }
};

/**
 * Safely retrieve function data with fallback
 */
export const getFunctionDataOperation = (
  dataProvider: HoverDataProvider,
  codeLensPath: string
): Result<string[]> => {
  if (!codeLensPath || typeof codeLensPath !== 'string') {
    return {
      success: false,
      error: createValidationError('Invalid code lens path', 'codeLensPath')
    };
  }

  try {
    const functionData = dataProvider.getFunctionData(codeLensPath);
    const dataPoints = functionData ? 
      functionData.dataPoints : 
      dataProvider.getDefaultPlaceholderData();

    if (!isValidDataPoints(dataPoints)) {
      return {
        success: false,
        error: createHoverError('Invalid data points format')
      };
    }

    return {
      success: true,
      data: dataPoints
    };
  } catch (error) {
    return {
      success: false,
      error: createHoverError(
        error instanceof Error ? error.message : String(error),
        'retrieving function data'
      )
    };
  }
};

/**
 * Safely create hover content data
 */
export const createHoverContentOperation = (
  dataPoints: string[],
  title?: string
): Result<HoverContentData> => {
  if (!isValidDataPoints(dataPoints)) {
    return {
      success: false,
      error: createValidationError('Invalid data points', 'dataPoints')
    };
  }

  try {
    const contentData = createHoverContentData(dataPoints, title);
    return {
      success: true,
      data: contentData
    };
  } catch (error) {
    return {
      success: false,
      error: createHoverError(
        error instanceof Error ? error.message : String(error),
        'creating hover content'
      )
    };
  }
};

/**
 * Safely create VS Code hover result
 */
export const createVSCodeHoverOperation = (
  contentData: HoverContentData,
  hoverFactory: VSCodeHover
): Result<VSCodeHoverResult> => {
  try {
    const markdownString = hoverFactory.createMarkdownString();
    markdownString.appendMarkdown(contentData.title + '\n\n');
    
    contentData.dataPoints.forEach(point => {
      markdownString.appendMarkdown(`• ${point}\n\n`);
    });

    const hover = hoverFactory.createHover(markdownString);
    return {
      success: true,
      data: hover
    };
  } catch (error) {
    return {
      success: false,
      error: createHoverError(
        error instanceof Error ? error.message : String(error),
        'creating VS Code hover'
      )
    };
  }
};

/**
 * Complete hover provision operation
 */
export const provideHoverOperation = (
  document: vscode.TextDocument,
  position: vscode.Position,
  dataProvider: HoverDataProvider,
  hoverFactory: VSCodeHover
): Result<VSCodeHoverResult | null> => {
  // Parse hover context
  const contextResult = parseHoverContextOperation(document, position);
  if (!contextResult.success) {
    return contextResult;
  }

  // Extract function match
  const matchResult = extractFunctionMatchOperation(contextResult.data);
  if (!matchResult.success) {
    return matchResult;
  }

  // If no function match found, return null (no hover)
  if (matchResult.data === null) {
    return {
      success: true,
      data: null
    };
  }

  // Get function data
  const dataResult = getFunctionDataOperation(dataProvider, matchResult.data.codeLensPath);
  if (!dataResult.success) {
    return dataResult;
  }

  // Create hover content
  const contentResult = createHoverContentOperation(dataResult.data);
  if (!contentResult.success) {
    return contentResult;
  }

  // Create VS Code hover
  const hoverResult = createVSCodeHoverOperation(contentResult.data, hoverFactory);
  if (!hoverResult.success) {
    return hoverResult;
  }

  return {
    success: true,
    data: hoverResult.data
  };
};