/**
 * Boundary Mocks Index
 * 
 * This module provides organized access to boundary mocks.
 * Import only what you need for testing external dependencies.
 * 
 * These are for BOUNDARY CODE ONLY
 * 
 * MOCK THESE (Boundaries):
 * - VS Code APIs (window, workspace, documents, providers)
 * - HTTP/Network calls (fetch, API requests)
 * - File system operations
 * - System clock/timers
 * 
 * NEVER MOCK THESE (Business Logic):
 * - Pure functions (validation, formatting, transformation)
 * - Business operations (domain logic)
 * - Internal interfaces (HoverDataProvider, AuthStorage, etc.)
 * - Data structures (FunctionData, AuthState, etc.)
 * 
 * Instead of mocking business logic:
 * - Test pure functions directly
 * - Use simple in-memory implementations
 * - Test with real business logic + mocked boundaries
 */

// VS Code Framework Boundaries
export * from './vscode';

// HTTP/Network Boundaries  
export * from './http';

// Convenience re-exports for common patterns
export { MockTextDocument, MockExtensionContext, MockSecretStorage } from './vscode';
export { MockHttpClient } from './http';