# @redjay/threads-mcp

MCP (Model Context Protocol) server for the Threads platform. Enables AI assistants like Claude to interact with your threads data.

## Installation

```bash
npm install @redjay/threads-mcp
```

## Usage

### With Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "threads": {
      "command": "threads-mcp"
    }
  }
}
```

### Standalone

```bash
npx @redjay/threads-mcp
```

## Available Tools

The MCP server exposes tools for:
- Creating and managing threads
- Adding progress entries
- Listing and searching threads
- Managing containers and groups
- Handling dependencies

## Protocol

Implements the Model Context Protocol specification for seamless AI assistant integration.

## License

MIT
