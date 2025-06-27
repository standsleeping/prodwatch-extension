/**
 * VS Code Boundary Mocks
 * 
 * This module exports mocks for VS Code framework APIs.
 * These are boundary mocks - external dependencies we don't control.
 * 
 * USE THESE FOR: Testing VS Code API integrations
 * DON'T USE FOR: Business logic, domain operations, internal interfaces
 */

// Document and editor mocks
export { MockTextDocument } from './documents';

// Extension context and storage mocks
export { MockExtensionContext, MockSecretStorage } from './extension';

// Provider and UI element mocks
export { 
  MockMarkdownString, 
  MockHover, 
  MockCodeLens, 
  VSCodeProviderMocks 
} from './providers';

// Re-export commonly used VS Code types for convenience
export * from 'vscode';