import { ServerDetailsToken } from "./ai.js";
import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "server" (channel's realtime_server reference).
// longer_alt points at server_details so the longer keyword still wins.
export const ServerToken = createTokenByName("server", {
  longer_alt: [ServerDetailsToken, Identifier],
  categories: [Identifier], // could also be an identifier
});

// "access"
export const AccessToken = createTokenByName("access", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// "publish"
export const PublishToken = createTokenByName("publish", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// "conversation"
export const ConversationToken = createTokenByName("conversation", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// "delivery"
export const DeliveryToken = createTokenByName("delivery", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// "rate_limit"
export const RateLimitToken = createTokenByName("rate_limit", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// ServerToken must be lexed AFTER `server_details` (a longer AI keyword) so it
// does not shadow it; the rest must be lexed BEFORE shorter-prefix keywords
// (e.g. `delivery` before `del`). They are therefore spread at two different
// points in the master token list — see lexer/tokens.js.
export const ChannelServerToken = ServerToken;

export const ChannelObjectTokens = [
  AccessToken,
  PublishToken,
  ConversationToken,
  DeliveryToken,
  RateLimitToken,
];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case ServerToken.name:
    case AccessToken.name:
    case PublishToken.name:
    case ConversationToken.name:
    case DeliveryToken.name:
    case RateLimitToken.name:
      return "keyword";
    default:
      return null;
  }
}
