export class Iterator {
  constructor(items) {
    this.items = items;
    this.index = 0;
  }

  next() {
    return this.items[this.index++];
  }

  hasNext() {
    return this.index < this.items.length;
  }

  reset() {
    this.index = 0;
  }
}

const schemeByFirstWord = {
  addon: "addon",
  agent: "agent",
  agent_trigger: "agent_trigger",
  api_group: "api_group",
  branch: "branch",
  channel: "channel",
  channel_trigger: "channel_trigger",
  error_trigger: "error_trigger",
  function: "cfn",
  mcp_server: "mcp_server",
  mcp_server_trigger: "mcp_server_trigger",
  message: "message",
  microservice: "microservice",
  middleware: "middleware",
  policy: "policy",
  prompt: "prompt",
  query: "api",
  realtime_server: "realtime_server",
  realtime_server_trigger: "realtime_server_trigger",
  realtime_trigger: "realtime_trigger",
  realtime_channel: "realtime_channel",
  resource: "resource",
  run: "run",
  table: "db",
  table_trigger: "table_trigger",
  task: "task",
  tool: "tool",
  workflow_test: "workflow_test",
  workspace: "workspace",
  workspace_trigger: "workspace_trigger",
};

// Matches the first keyword after optional whitespace and comments
// Skips:
// - Whitespace (spaces, tabs, newlines)
// - Comments (// ... until end of line)
const firstWordRegex = /^(?:\s|\/\/[^\n]*\n)*(\w+)/;
/**
 * detects the scheme to used based on the first word of the document
 * @param {string} source The source code of the document
 * @returns {string|undefined} The scheme of the document
 */
export function getSchemeFromContent(source) {
  const firstWord = source.match(firstWordRegex)?.[1];
  return schemeByFirstWord[firstWord] || "cfn";
}

// Reverse map: scheme codes back to user-facing object type keywords
const typeByScheme = {
  cfn: "function",
  api: "query",
  db: "table",
  // All other schemes map 1:1 (addon, agent, task, etc.)
};

// Extends firstWordRegex to also capture the name (quoted or bare identifier; a bare policy key
// may also hold "." and "-", e.g. `policy AUTH-001 {`)
const objectInfoRegex = /^(?:\s|\/\/[^\n]*\n)*(\w+)\s+(?:"([^"]+)"|(\w[\w.-]*))/;

/**
 * Extract the object type and name from XanoScript file content.
 * Reuses schemeByFirstWord for type detection, extends the regex to capture the name.
 * @param {string} source - File content
 * @returns {{ type: string, name: string } | null}
 */
export function getObjectInfoFromContent(source) {
  const match = source.match(objectInfoRegex);
  if (!match) return null;

  const firstWord = match[1];
  const scheme = schemeByFirstWord[firstWord];
  if (!scheme) return null;

  const name = match[2] ?? match[3];
  if (!name) return null;

  const type = typeByScheme[scheme] ?? scheme;
  return { type, name };
}
