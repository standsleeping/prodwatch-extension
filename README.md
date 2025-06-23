# ProdWatch VS Code Extension

See function calls in production from your editor.

## Features

- **Production Function Monitoring**: View real-time production function call data directly in your Python code.
- **Inline Call Counts**: See how many times each function has been called in production with CodeLens.
- **Detailed Hover Information**: Hover over functions to see:
  - Total number of calls.
  - Recent function calls with actual arguments.
  - Execution times for each call.
  - Error information when calls fail.
- **Automatic Data Fetching**: Production data is automatically loaded when you open or switch to Python files.
- **Authentication**: Secure login to your ProdWatch account.
- **Manual Data Refresh**: Refresh production data on demand for the current file.
- **Configurable API Endpoint**: Switch between production and local development servers.

## Getting Started

### 1. Install the Extension.

Install the ProdWatch extension from the VS Code marketplace.

### 2. Configure API URL (Optional).

By default, the extension connects to `https://getprodwatch.com`. To use a local development server:

1. Open VS Code Settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux)
2. Search for "prodwatch"
3. Set **ProdWatch: Api Url** to `http://localhost:8000`

Alternatively, add this to your `settings.json`:

```json
{
  "prodwatch.apiUrl": "http://localhost:8000"
}
```

### 3. Sign in to ProdWatch.

1. Type "ProdWatch: Login" into the Command Palette.
2. Enter your username and password when prompted.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `prodwatch.apiUrl` | `https://getprodwatch.com` | Base URL for ProdWatch API |

## Commands

| Command | Description |
|---------|-------------|
| `ProdWatch: Login` | Authenticate with your ProdWatch account |
| `ProdWatch: Refresh Function Data` | Manually refresh production data for the current Python file |

## How It Works

1. **Open Python Files**: The extension automatically activates when you open Python files
2. **View Call Counts**: Function call counts from production appear as CodeLens above each function definition
3. **Detailed Information**: Hover over any function to see:
   - Recent calls with actual parameters used in production
   - Execution time metrics
   - Error information if the function failed
4. **Stay Updated**: Data refreshes automatically when switching between files, or manually refresh on demand

## Requirements

- VS Code 1.97.0 or higher.
- Python files to monitor.
- Active ProdWatch account with production data.

