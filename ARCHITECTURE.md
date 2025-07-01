# Project Architecture Guide

This document explains the architectural patterns and code organization used in this VS Code extension project.

## Overview

This project follows the **"Functional Core, Imperative Shell"** architectural pattern, organizing code into three distinct layers that separate pure business logic from side effects and external dependencies.

## Three-Layer Architecture

### 1. Core Modules (`*Core.ts`)

**Purpose**: The "functional core" containing pure functions with no side effects.

**Characteristics**:
- Pure functions only - deterministic input/output
- No I/O operations, logging, or external dependencies
- Easy to test without mocking
- Contains validation, transformation, and utility functions

**Structure**:
```typescript
// Type definitions and interfaces
export interface Credentials {
  username: string;
  token: string;
}

// Pure validation functions
export const isValidToken = (token: string | undefined): boolean => {
  return typeof token === 'string' && token.length > 0;
};

// Pure transformation functions
export const normalizeCredentials = (credentials: Partial<Credentials>): Credentials => {
  return {
    username: (credentials.username || '').trim(),
    token: (credentials.token || '').trim()
  };
};

// Pure error handling utilities
export const createStorageError = (operation: string, originalError?: Error): Error => {
  const message = `Failed to ${operation} credentials`;
  const error = new Error(message);
  if (originalError) {
    error.cause = originalError;
  }
  return error;
};
```

### 2. Operations Modules (`*Operations.ts`)

**Purpose**: Business logic layer that orchestrates core functions using explicit error handling.

**Characteristics**:
- Uses Result types instead of exceptions
- Accepts dependencies via dependency injection (parameters)
- Composes pure functions from Core modules
- Contains no side effects (no logging, VS Code APIs)
- Fully testable without mocking

**Structure**:
```typescript
// Result type definitions
export type AuthOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error; validationErrors?: string[] };

// Interface abstractions for dependencies
export interface CredentialStorage {
  secrets: SecureStorage;
}

// Business operations that compose core functions
export const storeCredentialsOperation = async (
  storage: CredentialStorage,
  keys: AuthKeys,
  credentials: Partial<Credentials>
): Promise<AuthOperationResult<void>> => {
  // Use pure functions from Core
  const normalizedCreds = normalizeCredentials(credentials);
  const validationErrors = validateCredentials(normalizedCreds);

  if (validationErrors.length > 0) {
    return {
      success: false,
      error: new Error('Invalid credentials'),
      validationErrors
    };
  }

  // Safe storage operations
  const tokenResult = await storeTokenSafely(storage.secrets, keys.token, normalizedCreds.token);
  if (!tokenResult.success) {
    return { success: false, error: tokenResult.error };
  }

  return { success: true, data: undefined };
};
```

### 3. Service Modules (`*Service.ts`)

**Purpose**: The "imperative shell" that handles VS Code integration and side effects.

**Characteristics**:
- Singleton pattern for VS Code extension lifecycle
- Handles VS Code API integration
- Contains side effects (logging, notifications, UI)
- Converts Result types back to exceptions at the boundary
- Minimal logic - mostly delegation to Operations

**Structure**:
```typescript
export class AuthService {
  private static instance: AuthService;
  private storage: CredentialStorage;
  private keys: AuthKeys;

  private constructor(context: vscode.ExtensionContext) {
    this.storage = new VSCodeSecretStorage(context.secrets);
    this.keys = createAuthKeys();
  }

  public static getInstance(context: vscode.ExtensionContext): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(context);
    }
    return AuthService.instance;
  }

  // Delegate to operations, handle side effects at boundary
  public async storeCredentials(username: string, token: string): Promise<void> {
    const result = await storeCredentialsOperation(this.storage, this.keys, { username, token });
    
    if (!result.success) {
      Logger.error('Failed to store credentials', result.error); // Side effect
      vscode.window.showErrorMessage('Authentication failed'); // Side effect
      throw result.error; // Convert Result to exception at boundary
    }
    
    Logger.info('Credentials stored successfully'); // Side effect
  }
}
```

## Supporting Patterns

### Result Types for Explicit Error Handling

Instead of exceptions, operations return explicit success/failure results:

```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error; validationErrors?: string[] };

// Usage
const result = await someOperation();
if (!result.success) {
  // Handle error explicitly
  console.error(result.error.message);
  return;
}
// Use result.data safely
```

### Storage Abstraction Layer

External dependencies are wrapped in safe interfaces using Result types:

```typescript
export const storeTokenSafely = async (
  storage: SecureStorage,
  key: string,
  token: string
): Promise<StorageResult<void>> => {
  try {
    await storage.store(key, token);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};
```

### Dependency Injection

Operations receive dependencies as parameters rather than accessing global state:

```typescript
// ✅ Good - dependencies injected
export const storeCredentialsOperation = async (
  storage: CredentialStorage,  // Injected dependency
  keys: AuthKeys,             // Injected dependency
  credentials: Partial<Credentials>
): Promise<AuthOperationResult<void>> => {
  // Business logic here
};

// ❌ Bad - accessing global dependencies
export const storeCredentialsOperation = async (credentials: Credentials) => {
  const storage = GlobalStorage.getInstance(); // Global dependency
  // Business logic here
};
```

## File Organization

```
src/
├── auth/
│   ├── authCore.ts          # Pure functions (validation, transformation)
│   ├── storage.ts           # Storage abstractions and safe operations
│   ├── authOperations.ts    # Pure business logic operations
│   └── authService.ts       # Imperative shell (VS Code integration)
├── commands/
│   ├── login/
│   │   ├── loginCore.ts     # Pure login functions
│   │   ├── loginOperations.ts # Login business logic
│   │   └── loginService.ts  # VS Code command integration
└── test/
    ├── auth/
    │   ├── authCore.test.ts       # Pure function tests (no mocks)
    │   ├── authOperations.test.ts # Business logic tests
    │   └── authService.test.ts    # Integration tests (minimal)
    └── commands/
        └── login/
            ├── loginCore.test.ts
            ├── loginOperations.test.ts
            └── loginService.test.ts
```

## Testing Strategy

### Core Modules - Zero Mocking Required

Pure functions are tested directly without any mocking:

```typescript
suite('AuthCore', () => {
  suite('isValidToken', () => {
    test('should return true for non-empty string', () => {
      assert.strictEqual(isValidToken('abc123'), true);
      assert.strictEqual(isValidToken('token-with-dashes'), true);
    });

    test('should return false for invalid tokens', () => {
      assert.strictEqual(isValidToken(''), false);
      assert.strictEqual(isValidToken(undefined), false);
    });
  });
});
```

### Operations Modules - Simple In-Memory Implementations

Business logic is tested using simple in-memory implementations instead of mocks:

```typescript
const createMockStorage = (): SecureStorage => {
  const storage = new Map<string, string>();
  return {
    async get(key: string) { return storage.get(key); },
    async store(key: string, value: string) { storage.set(key, value); },
    async delete(key: string) { storage.delete(key); }
  };
};

suite('storeCredentialsOperation', () => {
  test('should store valid credentials', async () => {
    const storage = { secrets: createMockStorage() };
    const result = await storeCredentialsOperation(storage, keys, {
      username: 'user',
      token: 'token'
    });
    
    assert.strictEqual(result.success, true);
  });
});
```

### Service Modules - Minimal Integration Tests

Services are tested minimally, focusing on the integration points:

```typescript
suite('AuthService', () => {
  let context: vscode.ExtensionContext;
  let service: AuthService;

  setup(() => {
    // Reset singleton for test isolation
    (AuthService as any).instance = undefined;
    context = createMockContext();
    service = AuthService.getInstance(context);
  });

  test('should store and retrieve credentials', async () => {
    await service.storeCredentials('user', 'token');
    const isAuth = await service.isAuthenticated();
    assert.strictEqual(isAuth, true);
  });
});
```

## Import/Export Relationships

The architecture enforces clear dependency flow:

```typescript
// authCore.ts - no imports of project modules (pure)
export const isValidToken = (token: string | undefined): boolean => { ... };

// authOperations.ts - imports from Core
import { validateCredentials, normalizeCredentials } from './authCore';
export const storeCredentialsOperation = async (...) => { ... };

// authService.ts - imports from Operations
import { storeCredentialsOperation, getAuthStateOperation } from './authOperations';
export class AuthService { ... }

// extension.ts - imports Services
import { AuthService } from './auth/authService';
```

## Benefits of This Architecture

1. **Fast Testing** - Pure functions test instantly without I/O or mocking
2. **Reliable Tests** - Deterministic functions produce consistent results
3. **Easy Debugging** - Step through pure business logic without side effects
4. **Maintainable** - Clear separation of concerns makes changes predictable
5. **Testable** - Business logic is 100% testable independently of VS Code APIs
6. **Scalable** - Adding new features follows the same predictable patterns

## Migration Strategy

When adding new functionality:

1. **Start with Core** - Extract pure functions for validation and transformation
2. **Add Operations** - Create business logic operations using Result types
3. **Create Service** - Build thin service layer for VS Code integration
4. **Mirror in Tests** - Create test files that match the code structure
5. **Test Incrementally** - Add tests as you build each layer

## Key Principles Summary

- **Functional Core, Imperative Shell** - Separate pure logic from side effects
- **Result Types** - Explicit error handling without exceptions
- **Dependency Injection** - Operations receive dependencies as parameters
- **Zero Core Mocking** - Test business logic directly without mocks
- **Structure Mirroring** - Test organization matches code structure
- **Quality Over Quantity** - Meaningful tests over coverage metrics
- **Singleton Services** - Use singleton pattern only for VS Code integration layer

This architecture enables the project to maintain high test coverage (80%+) with fast execution times (~635ms for 262 tests) while keeping the code maintainable and easy to reason about.