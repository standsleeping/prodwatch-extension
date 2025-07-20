# ProdWatch VS Code Extension

See how your code is behaving in production directly in your editor. ProdWatch shows real-time function call data, execution times, and errors right alongside your code <strong>without requiring any code changes or deployments</strong>. Monitor your functions in production the same way you debug locally with full visibility into arguments, return values, and performance metrics.

## Features

### Production Function Monitoring

View real-time production function call data directly in your Python code. Configure which specific app to monitor, ensuring data is filtered to your application.

See how many times each function has been called in production with CodeLens (only shown for functions with calls). Hover over functions to see detailed information including:
- Total number of calls
- Recent function calls with actual arguments
- Execution times for each call
- Error information when calls fail
- Watch status (Active, Pending, Failed, Not Requested)
- **Watch Function button** to request monitoring for specific functions

### Configurable Data Fetching

Keep your production data up-to-date with multiple fetching options. Production data is automatically loaded when you open or switch to Python files. Optionally enable automatic background polling to keep function data continuously updated. You can also refresh production data on demand for the current file whenever needed.

### Self-Hosting and Flexibility

Host ProdWatch on your own infrastructure for complete control over your data. The extension supports configurable API endpoints, allowing you to switch between the hosted service at getprodwatch.com, your own self-hosted ProdWatch instance, or local development servers for testing and customization.

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

### 5. Configure Automatic Polling (Optional).

For real-time updates, you can enable automatic polling:

1. Open VS Code Settings (`Cmd+,` on Mac, `Ctrl+,` on Windows/Linux)
2. Search for "prodwatch"
3. Enable **ProdWatch: Polling Enabled**
4. Set **ProdWatch: Polling Interval Seconds** (5-300 seconds, default: 30)

Alternatively, add this to your `settings.json`:

```json
{
  "prodwatch.pollingEnabled": true,
  "prodwatch.pollingIntervalSeconds": 30
}
```

When enabled, the extension will automatically refresh function data every X seconds while you have Python files open.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `prodwatch.apiUrl` | `https://getprodwatch.com` | Base URL for ProdWatch API |
| `prodwatch.appName` | _(none)_ | Name of the app to monitor with ProdWatch |
| `prodwatch.pollingEnabled` | `false` | Enable automatic polling for function data updates |
| `prodwatch.pollingIntervalSeconds` | `30` | Polling interval in seconds (5-300 seconds) |

## Commands

| Command | Description |
|---------|-------------|
| `ProdWatch: Set App Name` | Configure which app to monitor (required) |
| `ProdWatch: Login` | Authenticate with your ProdWatch account |
| `ProdWatch: Refresh Function Data` | Manually refresh production data for the current Python file |

## How It Works

1. **Configure App**: Set the app name you want to monitor using "ProdWatch: Set App Name"
2. **Open Python Files**: The extension automatically activates when you open Python files
3. **View Call Counts**: Function call counts from production appear as CodeLens above each function definition (only shown for functions with calls, scoped to your configured app)
4. **Detailed Information**: Hover over any function to see:
   - Recent calls with actual parameters used in production
   - Execution time metrics
   - Error information if the function failed
   - Watch status (Active, Pending, Failed, Mixed States, Not Requested)
   - **Watch Function button** - click to request monitoring for functions not currently being watched
5. **Request Function Monitoring**: Use the "Watch Function" button in hover tooltips to request monitoring for specific functions
6. **Stay Updated**: Data refreshes automatically when switching between files, or enable automatic polling for real-time updates, or manually refresh on demand

## Requirements

- VS Code 1.97.0 or higher.
- Python files to monitor.
- Active ProdWatch account with production data.

