# ProdWatch VS Code Extension

See function calls in production from your editor.

## Features

- **App-Scoped Monitoring**: Configure which specific app to monitor, ensuring data is filtered to your application.
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

### 3. Set App Name.

1. Type "ProdWatch: Set App Name" into the Command Palette.
2. Enter the name of the app you want to monitor (e.g., "my-web-app").
3. All function monitoring will be scoped to this app.

### 4. Sign in to ProdWatch.

1. Type "ProdWatch: Login" into the Command Palette.
2. Enter your username and password when prompted.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `prodwatch.apiUrl` | `https://getprodwatch.com` | Base URL for ProdWatch API |
| `prodwatch.appName` | _(none)_ | Name of the app to monitor with ProdWatch |

## Commands

| Command | Description |
|---------|-------------|
| `ProdWatch: Set App Name` | Configure which app to monitor (required) |
| `ProdWatch: Login` | Authenticate with your ProdWatch account |
| `ProdWatch: Refresh Function Data` | Manually refresh production data for the current Python file |

## How It Works

1. **Configure App**: Set the app name you want to monitor using "ProdWatch: Set App Name"
2. **Open Python Files**: The extension automatically activates when you open Python files
3. **View Call Counts**: Function call counts from production appear as CodeLens above each function definition (scoped to your configured app)
4. **Detailed Information**: Hover over any function to see:
   - Recent calls with actual parameters used in production
   - Execution time metrics
   - Error information if the function failed
5. **Stay Updated**: Data refreshes automatically when switching between files, or manually refresh on demand

## Requirements

- VS Code 1.97.0 or higher.
- Python files to monitor.
- Active ProdWatch account with production data.

