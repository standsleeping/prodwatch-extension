# ProdWatch VS Code Extension

See function calls in production from your editor.

## Features

- **Login to ProdWatch**: Authenticate with your ProdWatch account

## Getting Started

### 1. Install the Extension

Install the ProdWatch extension from the VS Code marketplace.

### 2. Configure API URL (Optional)

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

### 3. Login

1. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
2. Type "ProdWatch: Login"
3. Enter your username and password

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `prodwatch.apiUrl` | `https://getprodwatch.com` | Base URL for ProdWatch API |

## Commands

| Command | Description |
|---------|-------------|
| `ProdWatch: Login` | Authenticate with your ProdWatch account |

## Development

### Local Development Setup

To use the extension with a local ProdWatch server:

1. Set the API URL to localhost:
   ```json
   {
     "prodwatch.apiUrl": "http://localhost:8000"
   }
   ```

2. Make sure your local server is running on port 8000

3. Use the login command to authenticate

