# Adding Jira MCP Server to Copilot Studio

To use this MCP server with Microsoft Copilot Studio, it must be accessible over the internet (HTTPS).

## Prerequisites
1.  **Node.js** installed.
2.  **ngrok** installed (to expose your localhost to the internet).
3.  **Copilot Studio** account.

## Step 1: Start the MCP Server
Run the server in SSE mode:

```powershell
# In PowerShell
$env:TRANSPORT="sse"; $env:PORT="3000"; node build/index.js
```

## Step 2: Expose via ngrok
### Option A: Using npx (Recommended)
```powershell
npx ngrok http 3000
```

### Option B: Manual Installation (If npx fails)
1.  Download ngrok from [ngrok.com](https://ngrok.com/download).
2.  Unzip it to a folder (e.g., this project folder).
3.  Run it directly:
    ```powershell
    .\ngrok.exe http 3000
    ```
Copy the **Forwarding URL** (e.g., `https://abcd-123.ngrok-free.app`).

## Step 3: Add to Copilot Studio as an Action

1.  **Get the OpenAPI Spec**:
    The server now auto-generates the spec at `/openapi.json`.
    Your full URL to the spec is: `https://abcd-123.ngrok-free.app/openapi.json`

2.  **Import in Copilot Studio**:
    - Go to **Copilot Studio** > **Actions** > **Add an action**.
    - Choose **"Import from URL"** (or similar option to add an API).
    - Paste your ngrok OpenAPI URL: `https://abcd-123.ngrok-free.app/openapi.json`.
    - Copilot Studio will detect the tools (`jira_search`, `jira_get_issue`, etc.).

3.  **Test**:
    - Ask Copilot: "Search Jira for 'login issue'" or "Get details for PROJ-123".

## Troubleshooting
- Ensure `.env` has valid `JIRA_PAT` and `JIRA_URL`.
- Check console logs for "New SSE connection" or API requests.
