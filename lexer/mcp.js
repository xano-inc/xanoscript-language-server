import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// MCP 2026-07-28 authoring keywords: the `prompt` and `resource` object kinds,
// the tool/prompt/resource metadata keys, and the `mcp.elicit` / `mcp.progress`
// statements, plus the per-server `oauth` block and the `mcp.oauth.complete` /
// `mcp.oauth.request` / `mcp.oauth.revoke` statements. Grounded against the Xano backend's schema DSL
// (`script/kind/schema/core/{prompt,resource,tool,mcp_server}.yaml` and
// `script/kind/schema/statement/mcp.{elicit,progress}.yaml`).
//
// Ordering note: a keyword with `longer_alt: Identifier` loses to an EARLIER
// shorter token, so `prompts` must precede `prompt`, and `resource` is lexed
// after `resources` (MicroserviceTokens, reused by the mcp_server parser).

// "prompts"
export const PromptsToken = createTokenByName("prompts", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "prompt"
export const PromptToken = createTokenByName("prompt", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "resource"
export const ResourceToken = createTokenByName("resource", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "title"
export const TitleToken = createTokenByName("title", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "annotations"
export const AnnotationsToken = createTokenByName("annotations", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "icons"
export const IconsToken = createTokenByName("icons", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "uri"
export const UriToken = createTokenByName("uri", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "mime_type"
export const MimeTypeToken = createTokenByName("mime_type", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "elicit" (mcp.elicit)
export const ElicitToken = createTokenByName("elicit", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "progress" (mcp.progress)
export const ProgressToken = createTokenByName("progress", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "oauth" (the mcp_server `oauth` block and the `mcp.oauth.*` statements)
export const OauthToken = createTokenByName("oauth", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "complete" (mcp.oauth.complete)
export const CompleteToken = createTokenByName("complete", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "revoke" (mcp.oauth.revoke)
export const RevokeToken = createTokenByName("revoke", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const McpObjectTokens = [
  PromptsToken,
  PromptToken,
  ResourceToken,
  TitleToken,
  AnnotationsToken,
  IconsToken,
  UriToken,
  MimeTypeToken,
  ElicitToken,
  ProgressToken,
  OauthToken,
  CompleteToken,
  RevokeToken,
];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case PromptToken.name:
    case ResourceToken.name:
    case PromptsToken.name:
      return "keyword";
    case TitleToken.name:
    case AnnotationsToken.name:
    case IconsToken.name:
    case UriToken.name:
    case MimeTypeToken.name:
    case OauthToken.name:
      return "variable";
    case ElicitToken.name:
    case ProgressToken.name:
    case CompleteToken.name:
    case RevokeToken.name:
      return "function";
    default:
      return null;
  }
}
