import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { OauthToken, PromptsToken } from "../lexer/mcp.js";
import {
  ActiveToken,
  InstructionsToken,
  McpServerToken,
  ToolsToken,
} from "../lexer/mcp_server.js";
import { ResourcesToken } from "../lexer/microservice.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function mcpServerDeclaration($) {
  return () => {
    let hasActive = false;
    let hasCanonical = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasDocs = false;
    let hasHistory = false;
    let hasMesh0 = false;
    let hasInstructions = false;
    let hasOauth = false;
    let hasPrompts = false;
    let hasResources = false;
    let hasTags = false;
    let hasTools = false;

    $.sectionStack.push("mcpServerDeclaration");
    // Allow leading comments and newlines before the mcp_server declaration
    $.SUBRULE($.optionalCommentBlockFn);
    const parent = $.CONSUME(McpServerToken); // mcp_server
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "mcp_server");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;

            $.CONSUME(ActiveToken); // "active"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.booleanValue); // true/false
          },
        },
        {
          GATE: () => !hasCanonical,
          ALT: () => {
            hasCanonical = true;
            $.SUBRULE($.canonicalClause);
          },
        },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasGuid,
          ALT: () => {
            hasGuid = true;
            $.SUBRULE($.guidFieldAttribute);
          },
        },
        {
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
          },
        },
        {
          GATE: () => !hasHistory,
          ALT: () => {
            hasHistory = true;
            $.SUBRULE($.historyClause);
          },
        },
        {
          GATE: () => !hasMesh0,
          ALT: () => {
            hasMesh0 = true;
            $.SUBRULE($.mesh0Clause);
          },
        },
        {
          GATE: () => !hasInstructions,
          ALT: () => {
            hasInstructions = true;

            // instructions = {string or multiline string}
            $.SUBRULE1($.flexibleStringClause, {
              ARGS: [InstructionsToken],
            });
          },
        },
        {
          // Per-server OAuth (values are validated server-side).
          // An assignment block like a channel's `publish`. mcp_server ONLY:
          // deliberately absent from agent_parser.js. Mode-specific rules
          // (hosted needs login_url, external needs issuer, ...) stay
          // server-side; only the key set and the enums are checked here.
          // There is no consent, branding or trusted_clients key: consent is
          // the customer's own login page, which calls mcp.oauth.complete
          // with a decision.
          GATE: () => !hasOauth,
          ALT: () => {
            hasOauth = true;

            const subParent = $.CONSUME(OauthToken); // "oauth"
            $.CONSUME5(EqualToken); // "="
            $.SUBRULE($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "mode?": ["hosted", "external"],
                  "auth_table?": "[string]",
                  // hosted; may be "${env.NAME}"
                  "login_url?": "[string]",
                  // external; may be "${env.NAME}"
                  "issuer?": "[string]",
                  "audience?": ["[string]"],
                  "audience_ack?": "[boolean]",
                  "claim?": "[string]",
                  "claim_ack?": "[boolean]",
                  "column?": "[string]",
                  "preset?": [
                    "auth0",
                    "clerk",
                    "workos",
                    "entra",
                    "okta",
                    "cognito",
                    "generic",
                  ],
                  "allowed_client_ids?": ["[string]"],
                },
              ],
            });
          },
        },
        {
          // First-class prompts attached to the server (MCP 2026-07-28).
          // mcp_server ONLY: deliberately absent from agent_parser.js.
          GATE: () => !hasPrompts,
          ALT: () => {
            hasPrompts = true;

            const subParent = $.CONSUME(PromptsToken); // "prompts"
            $.CONSUME3(EqualToken); // "="

            // [{name: "prompt_name", active: true, auth: "user"}]
            $.SUBRULE1($.schemaParseArrayFn, {
              ARGS: [
                subParent,
                [
                  {
                    name: "[string]",
                    "active?": "[boolean]",
                    "auth?": "[string]",
                  },
                ],
              ],
            });
          },
        },
        {
          // First-class resources attached to the server (MCP 2026-07-28).
          GATE: () => !hasResources,
          ALT: () => {
            hasResources = true;

            const subParent = $.CONSUME(ResourcesToken); // "resources"
            $.CONSUME4(EqualToken); // "="

            // [{name: "resource_name", active: true, auth: "user"}]
            $.SUBRULE2($.schemaParseArrayFn, {
              ARGS: [
                subParent,
                [
                  {
                    name: "[string]",
                    "active?": "[boolean]",
                    "auth?": "[string]",
                  },
                ],
              ],
            });
          },
        },
        {
          GATE: () => !hasTags,
          ALT: () => {
            hasTags = true;
            $.SUBRULE($.tagsAttribute);
          },
        },
        {
          GATE: () => !hasTools,
          ALT: () => {
            hasTools = true;

            const subParent = $.CONSUME(ToolsToken); // "tools"
            $.CONSUME2(EqualToken); // "="

            // [{"name":"tool_name"}]
            $.SUBRULE($.schemaParseArrayFn, {
              ARGS: [
                subParent,
                [
                  {
                    name: "[string]",
                    "active?": "[boolean]",
                    "auth?": "[string]",
                    "type?": "[string]",
                    "resource_uri?": "[string]",
                    "tool_meta?": "[string]",
                  },
                ],
              ],
            });
          },
        },
      ]);
    });

    if (!hasTools) {
      $.addMissingError(parent, "{} is missing tools clause");
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
