# Boundary Mocks

This directory contains **ONLY** mocks for **boundary code**: external dependencies that our system doesn't control.

## CRITICAL RULE: Zero Mocking for Core Business Logic

**NEVER mock business logic, domain operations, or internal interfaces here.**

### What Should Be Mocked (Boundaries)

#### `vscode/` - VS Code Framework APIs
- `vscode.TextDocument`, `vscode.Position`, `vscode.Range`
- `vscode.ExtensionContext`, `vscode.Memento`, `vscode.SecretStorage`
- `vscode.window.*`, `vscode.workspace.*`, `vscode.commands.*`
- `vscode.MarkdownString`, `vscode.Hover`, `vscode.CodeLens`

#### `http/` - External Network Calls
- HTTP clients, fetch implementations
- API response mocking
- Network error simulation

#### `filesystem/` - File System Operations
- File reading/writing operations
- Directory operations
- Path resolution (when touching actual file system)

#### `time/` - System Clock and Timers
- Date/time when critical to test behavior
- Timers, intervals, timeouts

### What Should NOT Be Mocked (Core Business Logic)

#### Never Mock These:
- **Pure functions** - validation, transformation, formatting
- **Business operations** - domain logic with dependency injection
- **Data structures** - object creation, manipulation
- **Internal interfaces** - `HoverDataProvider`, `AuthStorage`, etc.
- **Domain rules** - business constraints and logic

#### Instead, Use:
- **Direct testing** of pure functions
- **Simple in-memory implementations** for storage abstractions
- **Real business logic** with injected test dependencies
- **Functional composition** for complex operations

### Usage Guidelines

1. **Import boundary mocks by category**:
   ```typescript
   import { MockTextDocument, MockExtensionContext } from '../mocks/vscode';
   import { MockHttpClient } from '../mocks/http';
   ```

2. **Test business logic directly**:
   ```typescript
   // DON'T mock business interfaces
   const mockDataProvider = { getFunctionData: jest.fn() };
   
   // DO use simple in-memory implementations
   const dataService = new FunctionDataService(context);
   dataService.updateFromServerResponse(modulePath, mockServerResponse);
   ```

3. **Mock only at system boundaries**:
   ```typescript
   // Mock VS Code APIs
   const mockDocument = new MockTextDocument(uri, 'file.py');
   
   // Mock HTTP calls
   const mockHttp = new MockHttpClient();
   mockHttp.setResponse('/api/login', { token: 'abc123' });
   ```

### File Organization

```
mocks/
├── README.md                # This file
├── vscode/
│   ├── index.ts             # Re-exports all VS Code mocks
│   ├── documents.ts         # TextDocument, Position, Range, etc.
│   ├── extension.ts         # ExtensionContext, Memento, etc.
│   ├── ui.ts                # window, workspace, commands
│   └── providers.ts         # Hover, CodeLens, MarkdownString
├── http/
│   ├── index.ts             # Re-exports all HTTP mocks
│   └── client.ts            # HTTP client implementations
├── filesystem/
│   ├── index.ts             # Re-exports all filesystem mocks
│   └── operations.ts        # File system operation mocks
└── time/
    ├── index.ts             # Re-exports all time mocks
    └── clock.ts             # Date, timer mocks
```

### Testing Philosophy

> "The best tests are fast, deterministic, and test real behavior. Mock only what you don't control."

This boundary-focused approach ensures:
- **Fast execution** - No complex mock setups
- **Reliable tests** - Real business logic, predictable boundaries
- **Easy debugging** - Step through actual implementation
- **Safe refactoring** - Tests break only when behavior changes