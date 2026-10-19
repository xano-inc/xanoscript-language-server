# XanoScript Language Server

The [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation for XanoScript, the language that describes a [Xano](https://www.xano.com) backend: its APIs, functions, tables, tasks, agents, MCP servers and policies.

Xano is one platform to build, run and govern AI-built software. This server brings the platform's rules into the editor, so you and your coding agent see the problems a push would refuse while you write the code.

Built on [Chevrotain](https://chevrotain.io/) and maintained by the Xano team.

## Features

- **Diagnostics** - Errors and warnings as you type, including cross-file references, variable usage and workspace policy checks
- **Completion** - Context-aware suggestions, triggered by `.`, `:`, `$` and `|`
- **Hover** - Documentation for statements, filters, input variables and policy checks
- **Go to definition** - Jump to a referenced function, task, query or table, or to where a variable is set
- **Semantic highlighting** - Token-based highlighting for every XanoScript construct

## Installation

```sh
npm install @xano/xanoscript-language-server
```

Requires Node.js 20 or later.

## Usage

The package ships two entry points:

| Entry point | Runtime | Transport |
|---|---|---|
| `server.js` | Node.js | stdio / IPC, via `vscode-languageserver/node` |
| `language-server-worker.js` | Browser (Web Worker) | `postMessage`, via `vscode-languageserver/browser` |

Point any LSP client at `server.js` for `.xs` files. For example, with VS Code's `vscode-languageclient`:

```js
const serverModule = require.resolve("@xano/xanoscript-language-server/server.js");

const client = new LanguageClient(
  "xanoscript",
  "XanoScript",
  {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  },
  { documentSelector: [{ scheme: "file", language: "xanoscript" }] }
);
```

### Policy checks

XanoScript `policy` files are checked against Xano's policy check catalogue. The server ships a snapshot of it (`parser/policy/catalogueSnapshot.js`), so what it reports is a warning: your instance may be newer than the snapshot. A host that can fetch the live catalogue can load it with `setPolicyCatalogue()` from `parser/policy/catalogue.js`.

## Supported object types

| Type | Description |
|------|-------------|
| `query` | API endpoints with HTTP verbs, input validation and responses |
| `api_group` | Collections of related API endpoints |
| `function` | Reusable logic blocks with tests |
| `task` | Scheduled operations with cron-like triggers |
| `table` | Database schema definitions with column types |
| `table_trigger` | Database table triggers |
| `workflow_test` | Workflow test definitions |
| `middleware` | Middleware definitions |
| `addon` | Add-on definitions |
| `branch` | Branch definitions |
| `workspace` / `workspace_trigger` | Workspace definitions and triggers |
| `error_trigger` | Error trigger handlers |
| `agent` / `agent_trigger` | AI agent definitions and triggers |
| `tool` | Tool definitions, including MCP tool metadata |
| `mcp_server` / `mcp_server_trigger` | MCP server definitions and connection triggers |
| `prompt` / `resource` | MCP prompts and resources |
| `policy` | Workspace policies and their rules |
| `microservice` | Container and Helm microservice deployments |
| `realtime_channel` / `realtime_trigger` | Realtime v1 channels and triggers |
| `realtime_server` / `realtime_server_trigger` | Realtime v2 servers and connection triggers |
| `channel` / `channel_trigger` | Realtime v2 channels and join/leave triggers |
| `message` | Realtime v2 channel message handlers |
| `run` | Run job and service definitions |

## Built-in function domains

`ai`, `api`, `array`, `cloud`, `controls`, `datadog`, `db`, `debug`, `expect`, `math`, `mcp`, `object`, `realtime`, `redis`, `schema`, `security`, `storage`, `stream`, `text`, `util`, `var`, `zip`

## Project structure

```
├── server.js                  # Node LSP entry point
├── language-server-worker.js  # Browser (Web Worker) entry point
├── lexer/                     # Token definitions
├── parser/                    # Grammar rules
│   ├── base_parser.js         # Core XanoBaseParser
│   ├── [type]_parser.js       # One parser per object type
│   ├── attributes/            # Field attributes (description, disabled, sensitive)
│   ├── clauses/               # Blocks (stack, input, response, ...)
│   ├── definitions/           # Type and column definitions
│   ├── functions/             # Built-in statements by domain
│   ├── generic/               # Shared parsing components
│   └── policy/                # Policy check catalogue
├── onCompletion/              # Completion
├── onDefinition/              # Go to definition
├── onDidChangeContent/        # Diagnostics
├── onHover/                   # Hover documentation
├── onSemanticCheck/           # Semantic tokens
└── workspace/                 # Cross-file index and validation
```

## Contributing

This repository receives one commit per release. Development happens elsewhere, so pull requests are turned off here. Found a bug? [Open an issue](https://github.com/xano-inc/xanoscript-language-server/issues/new?template=bug_report.yml). [CONTRIBUTING.md](CONTRIBUTING.md) says what makes a report quick to fix.

## Security

To report a vulnerability, see [SECURITY.md](SECURITY.md). Please don't open a public issue.

## License

[MIT](LICENSE)
