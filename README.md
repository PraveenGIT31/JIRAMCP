# Jira MCP Server

This is a Model Context Protocol (MCP) server that connects to an on-premise Jira instance.

## Features

- **jira_search**: Search for Jira issues using text query.
  - Takes a `query` string.
  - Returns issue key, summary, status, and link.

## Setup

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Build the project**:
    ```bash
    npm run build
    ```

3.  **Configure Environment**:
    Create a `.env` file in the root directory with the following variables:
    ```env
    JIRA_URL=https://your-jira-instance.com
    JIRA_USERNAME=your-username
    JIRA_PASSWORD=your-password
    ```

## Usage

To run the server:

```bash
node build/index.js
```

Or use with an MCP client (e.g., Claude Desktop, etc.) by configuring it to run the above command.
