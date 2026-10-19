import { lexDocument } from "../lexer/lexer.js";
import { MultiLineExpressionToken, MultiLineStringToken } from "../lexer/multiline.js";
import { allTokens } from "../lexer/tokens.js";
import { getSchemeFromContent } from "../utils.js";
import { XanoBaseParser } from "./base_parser.js";
import { explainPolicySyntaxErrors } from "./policy_parser.js";

/**
 * Will parse the content of the file based on its scheme (db:/, task:/, api:/...)
 * @param {string} text
 * @param {string} scheme
 * @param {Object} [preTokenized] - Optional pre-tokenized result from lexDocument to avoid re-lexing
 * @returns
 */
export function xanoscriptParser(text, scheme, preTokenized = null) {
  if (!scheme) {
    scheme = getSchemeFromContent(text);
  }
  const lexResult = preTokenized || lexDocument(text);
  parser.reset();
  parser.input = lexResult.tokens;
  warnSeparatorsInStrings(lexResult.tokens);
  switch (scheme.toLowerCase()) {
    case "addon":
      parser.addonDeclaration();
      return parser;
    case "agent":
      parser.agentDeclaration();
      return parser;
    case "agent_trigger":
      parser.agentTriggerDeclaration();
      return parser;
    case "api":
      parser.queryDeclaration();
      return parser;
    case "api_group":
      parser.apiGroupDeclaration();
      return parser;
    case "branch":
      parser.branchDeclaration();
      return parser;
    case "channel":
      parser.channelDeclaration();
      return parser;
    case "channel_trigger":
      parser.channelTriggerDeclaration();
      return parser;
    case "error_trigger":
      parser.errorTriggerDeclaration();
      return parser;
    case "db":
      parser.tableDeclaration();
      return parser;
    case "mcp_server":
      parser.mcpServerDeclaration();
      return parser;
    case "mcp_server_trigger":
      parser.mcpServerTriggerDeclaration();
      return parser;
    case "message":
      parser.messageDeclaration();
      return parser;
    case "microservice":
      parser.microserviceDeclaration();
      return parser;
    case "middleware":
      parser.middlewareDeclaration();
      return parser;
    case "policy":
      parser.policyDeclaration();
      explainPolicySyntaxErrors(parser);
      // Chevrotain skips an unrecognized character (`#`, `§`). A policy must never validate the
      // text left after that recovery as if the character were absent: what the parse found at or
      // after it is dropped, and the character is reported as the platform's syntax error.
      if (lexResult.errors.length) {
        const skipped = lexResult.errors[0].offset;
        const before = (item) => !item.token || item.token.startOffset < skipped;
        parser.errors = parser.errors.filter(before);
        parser.warnings = parser.warnings.filter(before);
      }
      for (const error of lexResult.errors) {
        // The platform names the first character it cannot read; the lexer skips a run of them.
        // Quoted as PHP's escapeshellarg quotes it (redacted): a `'` is written `'\''`.
        const first = String.fromCodePoint(text.codePointAt(error.offset)).replaceAll("'", "'\\''");
        parser.addInvalidValueError({
          image: text.slice(error.offset, error.offset + error.length),
          startOffset: error.offset,
          endOffset: error.offset + error.length - 1,
          startLine: error.line,
          startColumn: error.column,
        }, `Syntax error: unexpected '${first}'`);
      }
      return parser;
    case "prompt":
      parser.promptDeclaration();
      return parser;
    case "resource":
      parser.resourceDeclaration();
      return parser;
    case "realtime_server":
      parser.realtimeServerDeclaration();
      return parser;
    case "realtime_server_trigger":
      parser.realtimeServerTriggerDeclaration();
      return parser;
    case "realtime_trigger":
      parser.realtimeTriggerDeclaration();
      return parser;
    case "realtime_channel":
      parser.realtimeChannelDeclaration();
      return parser;
    case "run":
      parser.runDeclaration();
      return parser;
    case "table_trigger":
      parser.tableTriggerDeclaration();
      return parser;
    case "task":
      parser.taskDeclaration();
      return parser;
    case "tool":
      parser.toolDeclaration();
      return parser;
    case "workflow_test":
      parser.workflowTestDeclaration();
      return parser;
    case "workspace":
      parser.workspaceDeclaration();
      return parser;
    case "workspace_trigger":
      parser.workspaceTriggerDeclaration();
      return parser;
    case "cfn":
    default: // Default to function parser
      parser.functionDeclaration();
      return parser;
  }
}

const SEPARATOR_IN_STRING =
  'A line that is only "---" separates documents in a multidoc push (xano workspace push, release push), even inside a string. Indent it to keep it in the text.';

/**
 * A triple-quoted string keeps a `---` line here, as the platform's single-document parse does,
 * but the platform's multidoc splitter ends a document at every unindented `---` line, strings
 * included. Warn on each one, at the line a push would split.
 */
function warnSeparatorsInStrings(tokens) {
  for (const token of tokens) {
    if (token.tokenType !== MultiLineStringToken && token.tokenType !== MultiLineExpressionToken) continue;
    for (const match of token.image.matchAll(/\n---[ \t]*(?=\r?\n)/g)) {
      const at = match.index + 1;
      parser.addWarning(SEPARATOR_IN_STRING, {
        image: "---",
        startOffset: token.startOffset + at,
        endOffset: token.startOffset + at + 2,
        startLine: token.startLine + (token.image.slice(0, at).match(/\n/g) || []).length,
        startColumn: 1,
      });
    }
  }
}

export class XanoScriptParser extends XanoBaseParser {
  constructor() {
    super(allTokens);
    this.performSelfAnalysis(); // Validates grammar and prepares parser
  }
}

export const parser = new XanoScriptParser();
