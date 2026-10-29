import { createToken as chevrotainCreateToken, Lexer } from "chevrotain";
import { Identifier } from "./identifier.js";
import {
  createTokenByName,
  createUniqToken as createToken,
  createUniqToken,
} from "./utils.js";

export const ObjectIdentifier = createToken({
  name: "ObjectIdentifier",
  pattern: /[0-9a-zA-Z_]\w*/,
});

export { Identifier };

import uniq from "lodash-es/uniq.js";
import {
  ActionTokens,
  mapTokenToType as mapActionTokenToType,
} from "./action.js";
import { AddonTokens, mapTokenToType as mapAddonTokenToType } from "./addon.js";
import { AgentTokens, mapTokenToType as mapAgentTokenToType } from "./agent.js";
import {
  AgentTriggerTokens,
  mapTokenToType as mapAgentTriggerTokenToType,
} from "./agent_trigger.js";
import { AiTokens, mapTokenToType as mapAiTokenToType } from "./ai.js";
import { ApiFnTokens, mapTokenToType as mapApiTokenToType } from "./api.js";
import {
  ApiGroupTokens,
  mapTokenToType as mapApiGroupTokenToType,
} from "./api_group.js";
import {
  ArrayFnTokens,
  mapTokenToType as mapArrayTokenToType,
} from "./arrays.js";
import {
  BranchTokens,
  mapTokenToType as mapBranchTokenToType,
} from "./branch.js";
import { CastTokens, mapTokenToType as mapCastTokenToType } from "./cast.js";
import {
  ChannelObjectTokens,
  ChannelServerToken,
  mapTokenToType as mapChannelObjectTokenToType,
} from "./channel.js";
import {
  ChannelTriggerTokens,
  mapTokenToType as mapChannelTriggerTokenToType,
} from "./channel_trigger.js";
import { CloudTokens, mapTokenToType as mapCloudTokenToType } from "./cloud.js";
import {
  ColumnTokens,
  mapTokenToType as mapColumnTokenToType,
} from "./columns.js";
import {
  CommentTokens,
  mapTokenToType as mapCommentTokenToType,
} from "./comment.js";
import {
  ControlTokens,
  mapTokenToType as mapControlsTokenToType,
} from "./control.js";
import {
  DatadogTokens,
  mapTokenToType as mapDatadogTokenToType,
} from "./datadog.js";
import { DbTokens, mapTokenToType as mapDbTokenToType } from "./db.js";
import { DebugTokens, mapTokenToType as mapDebugTokenToType } from "./debug.js";
import {
  ErrorTriggerTokens,
  mapTokenToType as mapErrorTriggerTokenToType,
} from "./error_trigger.js";
import {
  ExpectFnTokens,
  mapTokenToType as mapExpectTokenToType,
} from "./expect.js";
import {
  FunctionTokens,
  mapTokenToType as mapFunctionTokenToType,
} from "./function.js";
import {
  LiteralTokens,
  mapTokenToType as mapLiteralTokenToType,
} from "./literal.js";
import { mapTokenToType as mapMathTokenToType, MathTokens } from "./math.js";
import {
  mapTokenToType as mapMcpObjectTokenToType,
  McpObjectTokens,
} from "./mcp.js";
import {
  mapTokenToType as mapMcpServerTokenToType,
  McpServerTokens,
} from "./mcp_server.js";
import {
  mapTokenToType as mapMcpServerTriggerTokenToType,
  McpServerTriggerTokens,
} from "./mcp_server_trigger.js";
import {
  mapTokenToType as mapMessageTokenToType,
  MessageTokens,
} from "./message.js";
import {
  mapTokenToType as mapMicroserviceTokenToType,
  MicroserviceTokens,
} from "./microservice.js";
import {
  mapTokenToType as mapMiddlewareTokenToType,
  MiddlewareTokens,
} from "./middleware.js";
import {
  mapTokenToType as mapMultilineTokenToType,
  MultilineTokens,
} from "./multiline.js";
import {
  mapTokenToType as mapObjectTokenToType,
  ObjectTokens,
} from "./object.js";
import {
  mapTokenToType as mapPolicyTokenToType,
  PolicyTokens,
} from "./policy.js";
import { mapTokenToType as mapQueryTokenToType, QueryTokens } from "./query.js";
import {
  mapTokenToType as mapRealtimeTokenToType,
  RealtimeStatementTokens,
} from "./realtime.js";
import {
  mapTokenToType as mapRealtimeServerTriggerTokenToType,
  RealtimeServerTriggerTokens,
} from "./realtime_server_trigger.js";
import {
  mapTokenToType as mapRealtimeTriggerTokenToType,
  RealtimeTriggerTokens,
} from "./realtime_trigger.js";
import { mapTokenToType as mapRedisTokenToType, RedisTokens } from "./redis.js";
import { mapTokenToType as mapRunTokenToType, RunTokens } from "./run.js";
import {
  mapTokenToType as mapSecurityTokenToType,
  SecurityTokens,
} from "./security.js";
import {
  mapTokenToType as mapStorageTokenToType,
  StorageTokens,
} from "./storage.js";
import {
  mapTokenToType as mapStreamTokenToType,
  StreamTokens,
} from "./stream.js";
import { mapTokenToType as mapTableTokenToType, TableTokens } from "./table.js";
import {
  mapTokenToType as mapTableTriggerTokenToType,
  TableTriggerTokens,
} from "./table_trigger.js";
import { mapTokenToType as mapTaskTokenToType, TaskTokens } from "./task.js";
import { mapTokenToType as mapTextTokenToType, TextTokens } from "./text.js";
import { mapTokenToType as mapToolTokenToType, ToolTokens } from "./tool.js";
import { mapTokenToType as mapUtilTokenToType, UtilTokens } from "./util.js";
import { mapTokenToType as mapVarTokenToType, VarTokens } from "./var.js";
import {
  mapTokenToType as mapVariableTokenToType,
  VariableTokens,
} from "./variables.js";
import {
  mapTokenToType as mapWorkflowTestTokenToType,
  WorkflowTestTokens,
} from "./workflow_test.js";
import {
  mapTokenToType as mapWorkspaceTokenToType,
  WorkspaceTokens,
} from "./workspace.js";
import {
  mapTokenToType as mapWorkspaceTriggerTokenToType,
  WorkspaceTriggerTokens,
} from "./workspace_trigger.js";
import { mapTokenToType as mapZipTokenToType, ZipTokens } from "./zip.js";

export const DotToken = createToken({ name: "Dot", pattern: /\./, label: "." });

export const TagsToken = createTokenByName("tags", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const NowToken = createTokenByName("now", {
  longer_alt: Identifier,
});

export const NullToken = createTokenByName("null", {
  longer_alt: Identifier,
});

// regular expression (regexp) pattern
// A regexp literal only appears after a colon (e.g., filter:pattern:/[^abc]*/)
const regexpPattern = /\/(?:[^/\n\\ ]|\\.)(?:[^/\n\\]|\\.)*\//y;
function matchRegExp(text, startOffset, tokens) {
  if (
    tokens.length === 0 ||
    tokens[tokens.length - 1].tokenType.name !== "ColonToken"
  ) {
    return null;
  }
  regexpPattern.lastIndex = startOffset;
  const result = regexpPattern.exec(text);
  if (result) {
    return [result[0]];
  }
  return null;
}

export const RegExpToken = chevrotainCreateToken({
  name: "RegExpToken",
  label: "regexp",
  pattern: { exec: matchRegExp },
  line_breaks: false,
  start_chars_hint: ["/"],
});

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
  label: "whitespace",
});

export const NewlineToken = createToken({
  name: "NewlineToken",
  pattern: /(\r?\n)/,
});

export const TypeToken = createTokenByName("type", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const FieldToken = createTokenByName("field", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const TrueToken = createTokenByName("true", {
  longer_alt: Identifier,
});

export const FalseToken = createTokenByName("false", {
  longer_alt: Identifier,
});

export const InputToken = createTokenByName("input", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const StackToken = createTokenByName("stack", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const TestToken = createTokenByName("test", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ResponseToken = createTokenByName("response", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ViewToken = createTokenByName("view", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const MiddlewareToken = createTokenByName("middleware", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const DbReturnAggregateToken = createTokenByName("return_aggregate", {
  pattern: /return_aggregate/,
});

export const AuthToken = createTokenByName("auth", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const SecurityToken = createTokenByName("security", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const HistoryToken = createTokenByName("history", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// `mesh0 = {logging}` on objects and containers.
export const Mesh0Token = createTokenByName("mesh0", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const Cachetoken = createTokenByName("cache", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const GuidToken = createTokenByName("guid", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const SchemaToken = createTokenByName("schema", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const IndexToken = createTokenByName("index", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ValuesToken = createTokenByName("values", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ValueToken = createTokenByName("value", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// filters
export const FiltersToken = createTokenByName("filters", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// special case filter for db links (table reference)
export const DbLinkToken = createUniqToken({
  name: "DbLinkFilter",
  label: "@",
  pattern: /@/,
});

// define the sensitivity of a column
export const SensitiveToken = createTokenByName("sensitive", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// define the sensitivity of a column
export const TriggerToken = createTokenByName("trigger", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const DescriptionToken = createTokenByName("description", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const DisabledToken = createTokenByName("disabled", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const MockToken = createTokenByName("mock", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const DocsToken = createTokenByName("docs", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const DbIdentifier = createToken({
  name: "DbIdentifier",
  label: "db.identifier",
  pattern: /dbo=\d+/,
});

// "in"
export const JsonInToken = createUniqToken({
  name: "JsonInToken",
  pattern: /in/,
  label: "in",
  longer_alt: Identifier,
  categories: [Identifier],
});

export const allTokens = uniq([
  WhiteSpace,
  NewlineToken,
  ...MultilineTokens,
  ...CommentTokens, // Must come before ControlTokens to match // before single /
  RegExpToken,
  IndexToken,
  InputToken,
  DbReturnAggregateToken,
  FiltersToken,
  ...AgentTriggerTokens,
  ...McpServerTriggerTokens,
  ...McpServerTokens,
  ...MicroserviceTokens,
  ...RealtimeServerTriggerTokens,
  ...RealtimeTriggerTokens,
  ...ChannelTriggerTokens,
  ...MessageTokens,
  // channel-object keywords (access/publish/conversation/delivery/rate_limit)
  // must precede shorter-prefix keywords like `del` (db/redis)
  ...ChannelObjectTokens,
  ...ArrayFnTokens,
  ...ColumnTokens,
  ...LiteralTokens,
  ...ControlTokens,
  ...QueryTokens,
  ...CastTokens,
  DbLinkToken,
  DbIdentifier,
  ValuesToken,
  ValueToken,
  TrueToken,
  FalseToken,
  TypeToken,
  FieldToken,
  AuthToken,
  GuidToken,
  SensitiveToken,
  TriggerToken,
  TagsToken,
  DescriptionToken,
  DocsToken,
  DisabledToken,
  MockToken,
  SchemaToken,
  StackToken,
  TestToken,
  MiddlewareToken,
  ...MiddlewareTokens,
  ResponseToken,
  NullToken,
  NowToken,
  HistoryToken,
  Mesh0Token,
  Cachetoken,
  SecurityToken,
  ...StorageTokens,
  ...ZipTokens,
  ...FunctionTokens,
  ...SecurityTokens,
  ...UtilTokens,
  ...TableTriggerTokens,
  ...WorkspaceTriggerTokens,
  ...ErrorTriggerTokens,
  ...TaskTokens,
  ...WorkflowTestTokens,
  ...ApiGroupTokens,
  ...ApiFnTokens,
  // bare `realtime` must be lexed AFTER the longer `realtime_*` keywords
  // (realtime_trigger/realtime_channel/realtime_server + api.realtime_event)
  // so it does not shadow them (UNREACHABLE lexer error otherwise).
  ...RealtimeStatementTokens,
  ...VariableTokens,
  ...TableTokens,
  ...CloudTokens,
  ...DbTokens,
  ...RedisTokens,
  ...TextTokens,
  ...RunTokens,
  ...ObjectTokens,
  ...StreamTokens,
  ...DatadogTokens,
  ...DebugTokens,
  ...ExpectFnTokens,
  ...VarTokens,
  ...MathTokens,
  ...AiTokens, // AI tokens must come before AgentTokens to avoid conflicts
  // `server` must be lexed AFTER `server_details` (an AI keyword) so it does not
  // shadow it; its longer_alt keeps `server_details` input matching correctly.
  ChannelServerToken,
  ...AgentTokens, // Must come before ToolTokens because of ToolsToken
  ...ToolTokens,
  // MCP authoring keywords (prompt/resource kinds, tool metadata, mcp.*);
  // after MicroserviceTokens so `resources` wins over `resource`.
  ...McpObjectTokens,
  ...AddonTokens,
  ...ActionTokens,
  ...BranchTokens,
  ...PolicyTokens,
  ...WorkspaceTokens,
  ViewToken,
  JsonInToken,
  DotToken,
  Identifier, // General identifier last to catch unmatched words
]);

const tokenMappers = [
  mapAddonTokenToType,
  mapActionTokenToType,
  mapAiTokenToType,
  mapAgentTokenToType,
  mapAgentTriggerTokenToType,
  mapApiGroupTokenToType,
  mapApiTokenToType,
  mapArrayTokenToType,
  mapBranchTokenToType,
  mapCastTokenToType,
  mapChannelObjectTokenToType,
  mapChannelTriggerTokenToType,
  mapCloudTokenToType,
  mapColumnTokenToType,
  mapCommentTokenToType,
  mapControlsTokenToType,
  mapDatadogTokenToType,
  mapDbTokenToType,
  mapDebugTokenToType,
  mapErrorTriggerTokenToType,
  mapExpectTokenToType,
  mapFunctionTokenToType,
  mapLiteralTokenToType,
  mapMathTokenToType,
  mapMcpObjectTokenToType,
  mapMcpServerTokenToType,
  mapMcpServerTriggerTokenToType,
  mapMessageTokenToType,
  mapMicroserviceTokenToType,
  mapMiddlewareTokenToType,
  mapMultilineTokenToType,
  mapObjectTokenToType,
  mapPolicyTokenToType,
  mapQueryTokenToType,
  mapRealtimeTokenToType,
  mapRealtimeServerTriggerTokenToType,
  mapRealtimeTriggerTokenToType,
  mapRedisTokenToType,
  mapRunTokenToType,
  mapSecurityTokenToType,
  mapStorageTokenToType,
  mapStreamTokenToType,
  mapTableTokenToType,
  mapTableTriggerTokenToType,
  mapTaskTokenToType,
  mapTextTokenToType,
  mapToolTokenToType,
  mapUtilTokenToType,
  mapVarTokenToType,
  mapVariableTokenToType,
  mapWorkflowTestTokenToType,
  mapWorkspaceTokenToType,
  mapWorkspaceTriggerTokenToType,
  mapZipTokenToType,
];

// Pre-built token type map for O(1) lookups
const tokenTypeMap = new Map();

// Build the map at module initialization time
function buildTokenTypeMap() {
  // Add local token mappings first
  const localMappings = {
    // Structural and control keywords
    [Cachetoken.name]: "keyword",
    [HistoryToken.name]: "keyword",
    [Mesh0Token.name]: "keyword",
    [IndexToken.name]: "keyword",
    [InputToken.name]: "keyword",
    [MiddlewareToken.name]: "keyword",
    [MockToken.name]: "keyword",
    [ResponseToken.name]: "keyword",
    [ViewToken.name]: "keyword",
    [SchemaToken.name]: "keyword",
    [SecurityToken.name]: "keyword",
    [StackToken.name]: "keyword",
    [TestToken.name]: "keyword",
    [FiltersToken.name]: "keyword",

    [DbLinkToken.name]: "function",
    [TriggerToken.name]: "function",

    // Variable-related tokens
    [AuthToken.name]: "variable",
    [DbIdentifier.name]: "variable",
    [DbReturnAggregateToken.name]: "variable",
    [DescriptionToken.name]: "variable",
    [DisabledToken.name]: "variable",
    [DocsToken.name]: "variable",
    [FieldToken.name]: "variable",
    [GuidToken.name]: "variable",
    [SensitiveToken.name]: "variable",
    [TagsToken.name]: "variable",
    [TypeToken.name]: "variable",
    [ValueToken.name]: "variable",
    [ValuesToken.name]: "variable",

    [Identifier.name]: "property",

    [FalseToken.name]: "enumMember",
    [NowToken.name]: "enumMember",
    [NullToken.name]: "enumMember",
    [TrueToken.name]: "enumMember",

    [DotToken.name]: "punctuation",
    [RegExpToken.name]: "regexp",
    [JsonInToken.name]: "operator",

    // Skip whitespace and newlines
    [NewlineToken.name]: null,
    [WhiteSpace.name]: null,
  };

  for (const [tokenName, type] of Object.entries(localMappings)) {
    tokenTypeMap.set(tokenName, type);
  }

  // Iterate through all tokens and populate the map using the mappers
  for (const token of allTokens) {
    if (tokenTypeMap.has(token.name)) continue;

    for (const mapper of tokenMappers) {
      const type = mapper(token.name);
      if (type) {
        tokenTypeMap.set(token.name, type);
        break;
      }
    }
  }
}

// Initialize the map at module load
buildTokenTypeMap();

/**
 * Map a token to a type (e.g., keyword, variable, etc.)
 * Uses pre-built map for O(1) lookup instead of O(n) iteration.
 * @param {string} token - Token name
 * @returns {string | null | undefined} The type of the token
 */
export function mapTokenToType(token) {
  if (tokenTypeMap.has(token)) {
    return tokenTypeMap.get(token);
  }
  return undefined; // Skip unmapped or unknown tokens
}
