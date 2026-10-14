# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (always run first)
npm install

# Run tests (required for CI)
npm test

# Run specific test
npm test -- -g "test name"

# Lint code (required for CI)
npm run lint

# Generate TextMate language definition (optional)
npm run tm
```

The full suite runs in a few seconds.

## Architecture Overview

This is a Language Server Protocol (LSP) implementation for XanoScript, built on Chevrotain parser generator. The architecture follows: **Lexer → Parser → Language Server Features**.

### Core Components

**Lexer (`lexer/`)**: Token definitions and lexical analysis

- `tokens.js` - Main token registry
- `lexer.js` - Chevrotain lexer implementation
- Domain tokens: `api.js`, `db.js`, `cloud.js`, `function.js`, etc.
- `utils.js` - Token creation utilities (`createToken`, `createTokenByName`)

**Parser (`parser/`)**: Grammar rules and parsing logic

- `base_parser.js` - Core XanoBaseParser extending Chevrotain
- Main parsers: `query_parser.js`, `function_parser.js`, `task_parser.js`, `api_group_parser.js`, `table_parser.js`, `workflow_test_parser.js`, `table_trigger_parser.js`
- `attributes/` - Field attributes (description, disabled, sensitive)
- `clauses/` - Language blocks (stack, input, response, security, auth, cache, history, index, schema, test)
- `definitions/` - Type and column definitions
- `functions/` - Built-in functions organized by domain (api, array, cloud, controls, db, debug, expect, math, object, redis, time, util, variable)
- `generic/` - Reusable parsing components

**Language Server (`server.js` + feature directories)**:

- `onCompletion/` - Auto-completion logic
- `onDidChangeContent/` - Live diagnostics and error reporting
- `onHover/` - Documentation and hover information
- `onSemanticCheck/` - Syntax highlighting token generation

### XanoScript Object Types

Primary constructs parsed by dedicated parsers:

- **query** - API endpoints with HTTP verbs, input validation, processing logic, responses
- **function** - Reusable logic blocks with testing capabilities
- **task** - Scheduled operations with cron-like triggers
- **api_group** - Collections of related API endpoints
- **table** - Database schema definitions with column types
- **workflow_test** - Test definitions for workflows
- **table_trigger** - Database table trigger definitions
- **microservice** - A container/Helm microservice deployment (`microservice <name> { ... }`). Optional top-level `description`/`guid`/`kind`/`tenant_deploy` scalars; repeating `config`/`volume`/`ingress` blocks; a `chart` block; and a `deployment` block with repeating `container` blocks (each carrying `image`/`pull_secret`/`type`, `command`/`arg`/`env`/`ports` object-lists, a `resources` object, and repeating container-level `volume` blocks). Grammar (`parser/microservice_parser.js`, tokens in `lexer/microservice.js`) is grounded against the Xano backend's XanoScript schema. Reuses `MicroserviceToken` (`lexer/api.js`, shared with the inline `api.microservice` statement) — the two are disambiguated by scheme context.
- **policy** - A policy document (`policy <KEY> { <field> = <literal> ... rule { check = "...", params = {...} } }`). `parser/policy_parser.js` (tokens in `lexer/policy.js`) knows only the block SHAPE and the rules the platform enforces (no comments inside the block, unnamed `rule {`, literal values). It knows no field and no check: the policy's and a rule's fields (types, value sets, defaults, retired fields, reserved blocks, key pattern, when a rule is required) come from the catalogue's `document`, and check ids with each check's params, types, value sets and descriptions from its `items` (the platform's `GET workspace/{id}/policy/check`). A host loads it with `setPolicyCatalogue()` (`parser/policy/catalogue.js`; empty by default = shape only). The Xano editor sends its live answer (findings are errors); `server.js` and `language-server-worker.js` load `parser/policy/catalogueSnapshot.js` (findings are dated warnings). Regenerate the snapshot whenever the platform's catalogue changes with `npm run gen:policy-catalogue -- <file>`, where `<file>` is the platform's served catalogue (`xano policy catalogue -o json`; Xano maintainers use the committed copy in the backend repo). Completion (`onCompletion/policyCompletion.js`) and hover (`onHover/PolicyMessageProvider.js`) read the same catalogue.

MCP objects and statements (MCP spec 2026-07-28; grounded against the Xano backend's XanoScript schema):

- **prompt** / **resource** - First-class MCP primitives (`parser/mcp_primitive_parser.js`, one shared builder, tokens in `lexer/mcp.js`). A resource has a required `uri` (a literal URI or an RFC 6570 level-1 template); its template variables and its `input` fields must be the same set, mirroring the backend's check.
- **tool metadata** - `title`, `annotations` (`read_only_hint`/`destructive_hint`/`idempotent_hint`/`open_world_hint`), `icons` and `output` on `tool`. `title`/`icons` are shared with prompt and resource through `parser/clauses/mcpMetadataClauses.js`, which also holds the icon `src` rule (https or a png/jpeg/webp base64 `data:` URI, never SVG).
- **mcp_server** `prompts` / `resources` blocks (`name`, `active`, `auth`). These exist on `mcp_server` ONLY; never add them to `agent_parser.js`.
- **mcp_server** `oauth = { ... }` block (per-server OAuth). An assignment block parsed with `schemaParseObjectFn` like a channel's `publish`; only the key set and the `mode`/`preset` enums are checked here (there is no `consent`, `branding` or `trusted_clients` key; consent is the customer's login page), the mode-specific requirements stay server-side. `mcp_server` ONLY, never `agent`. The connection trigger (`mcp_server_trigger`) receives the signed-in user as a `json? auth` input, which the ordinary `input` grammar already accepts.
- **`mcp.oauth.complete`** / **`mcp.oauth.request`** / **`mcp.oauth.revoke`** statements (`parser/functions/mcp/mcpOauthFn.js`, tokens `OauthToken`/`CompleteToken`/`RevokeToken` in `lexer/mcp.js`, `request` reuses `RequestToken`). Each takes an optional `as $var`. `complete` requires `request` and `decision`; a string-literal `decision` is checked against `approve`/`deny`, any other expression is left to run time. `revoke`'s "exactly one of `user_id`/`grant_id`/`all`" is a run-time check on the VALUES (`all = false` beside `grant_id` is valid), so it is deliberately not a static diagnostic.
- **`mcp.elicit`** / **`mcp.progress`** statements (`parser/functions/mcp/`, dispatcher `parser/functions/mcpFn.js`, reusing `McpToken` from `lexer/ai.js`). `nakedStackFn` records each statement so `parser/functions/mcp/elicitLint.js` can warn when a write (`db.*` writes, non-GET `api.request`, `util.send_email`, `function.run`) precedes the first elicit: the client retries the whole request per answer, so earlier statements re-run.

Realtime v2 objects (the OpenSwoole WebSocket tier; distinct from the v1 `realtime_channel`/`realtime_trigger` kinds, which coexist):

- **channel** - A realtime v2 channel: a path-template container (`channel "rooms/{room_id}"`) with typed path-param `input`, plus `server`/`access`/`publish`/`conversation`/`delivery`/`rate_limit`/`history` config
- **message** - A named handler on a channel (`channel`/`deliver_to`/`auth`/`input`/`stack`/`middleware`/`response`) — the invocable unit, mirroring `api_group` → `query`
- **channel_trigger** - A channel lifecycle trigger (`join`/`leave` actions) — parent ref `channel = "..."`
- **realtime_server_trigger** - A connection lifecycle trigger (`connect`/`disconnect` actions) — parent ref `realtime_server = "..."`

The `realtime.*` function domain (`parser/functions/realtime/`, dispatcher `parser/functions/realtimeFn.js`, tokens in `lexer/realtime.js`) holds the author-facing realtime stack statements:

- **`realtime.get_session`** (`realtime.get_session as $session`) — the current connection's session; has an `as $var` binding.
- **`realtime.publish`** — inject a server-authored event onto a realtime v2 channel. `realtime_server`/`channel`/`data` required; `message`/`auth_table`/`auth_id`/`description`/`disabled` optional. NO `as` binding. Parser fn `parser/functions/realtime/realtimePublishFn.js`, token `PublishToken`.

Add new `realtime.*` statements under this domain (token in `lexer/realtime.js` → `RealtimeStatementTokens` + `mapTokenToType`, fn in `parser/functions/realtime/`, register in its `register.js`, dispatcher ALT in `realtimeFn.js`).

## Adding New Features

### New Top-Level Parser (e.g., `run.job`, `run.service`)

Follow this step-by-step process:

**1. Create lexer tokens (`lexer/my_feature.js`)**

```javascript
import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

export const MyToken = createTokenByName("my_keyword", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const MyFeatureTokens = [MyToken];

export function mapTokenToType(token) {
  switch (token) {
    case MyToken.name:
      return "keyword";
    default:
      return null;
  }
}
```

**2. Register tokens in `lexer/tokens.js`**

- Import tokens and mapper at the top
- Add `...MyFeatureTokens` to `allTokens` array
- Add `mapMyFeatureTokenToType` to `tokenMappers` array

**3. Create parser (`parser/my_feature_parser.js`)**

```javascript
import { StringLiteral } from "../lexer/literal.js";
import { MyToken } from "../lexer/my_feature.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function myFeatureDeclaration($) {
  return () => {
    $.sectionStack.push("myFeatureDeclaration");
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(MyToken);
    $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);

    // Use schemaParseAttributeFn for body with declarative schema
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          required_attr: "[string]",
          "optional_attr?": "[boolean]",
          "nested?": {
            name: "[string]",
            "value?": { "[string]": "[constant]" },
          },
          "array_of_strings?": ["[string]"],
        },
      ],
    });

    $.MANY2(() => $.CONSUME2(NewlineToken));
    $.sectionStack.pop();
  };
}
```

**4. Register parser in `parser/register.js`**

```javascript
import { myFeatureDeclaration } from "./my_feature_parser.js";
// In register function:
$.myFeatureDeclaration = $.RULE(
  "myFeatureDeclaration",
  myFeatureDeclaration($)
);
```

**5. Add scheme detection in `utils.js`**

```javascript
const schemeByFirstWord = {
  // ... existing entries
  my_feature: "my_feature",
};
```

**6. Route scheme in `parser/parser.js`**

```javascript
case "my_feature":
  parser.myFeatureDeclaration();
  return parser;
```

**7. Write tests (`parser/my_feature_parser.spec.js`)**

```javascript
import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("my_feature", () => {
  it("should parse a basic my_feature", () => {
    const parser = xanoscriptParser(`my_feature "name" {
      required_attr = "value"
    }`);
    expect(parser.errors).to.be.empty;
  });
});
```

### Schema Definition Types (for `schemaParseAttributeFn`)

| Schema                         | Description                        | Example                   |
| ------------------------------ | ---------------------------------- | ------------------------- |
| `"[string]"`                   | String literal                     | `"hello"`                 |
| `"[number]"`                   | Number literal                     | `123`                     |
| `"[boolean]"`                  | Boolean value                      | `true` / `false`          |
| `"[constant]"`                 | Value expression (no variables)    | `"text"`, `123`, `{a: 1}` |
| `"[expression]"`               | Any expression including variables | `$var`, `$input.name`     |
| `["[string]"]`                 | Array of strings                   | `["a", "b"]`              |
| `{ "[string]": "[constant]" }` | Object with string keys            | `{key: "value"}`          |
| `"attr?"`                      | Optional attribute                 | May be omitted            |
| `"!attr"`                      | Can be disabled                    | `!attr = value`           |

### New Keyword/Function

1. Add token definition in appropriate `lexer/` file
2. Create function implementation in `parser/functions/[domain]/`
3. Register in parent clause or parser
4. Add comprehensive tests in corresponding `.spec.js` file

### Token Creation Pattern

```javascript
export const MyToken = createTokenByName("keyword", {
  longer_alt: Identifier,
  categories: [Identifier],
});
```

### Parser Rule Pattern

```javascript
myRule = this.RULE("myRule", () => {
  this.CONSUME(MyToken);
  this.SUBRULE(this.otherRule);
});
```

## Testing Guidelines

- Tests use Mocha + Chai framework
- Test files use the `.spec.js` naming convention
- Test structure mirrors source structure
- Real XanoScript examples in `valid_sources/` directories
- Tests are explicit and straightforward - avoid dynamic test generation
- CI requires all tests to pass

### Test Pattern

```javascript
function parse(inputText) {
  const lexResult = lexDocument(inputText);
  const parser = new Parser();
  parser.input = lexResult.tokens;
  parser.myRule();
  return parser;
}
```

## Development Notes

- **Node.js 20+ required** for ES module support
- **No compilation step** - pure JavaScript ES modules
- Use `import`/`export`, not `require()`
- Follow existing code conventions when adding features
- Check neighboring files for patterns and conventions
- Never assume a library is available - check `package.json` first
- 3 low-severity npm audit warnings are known and acceptable
