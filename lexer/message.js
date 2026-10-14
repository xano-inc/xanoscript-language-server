import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "message"
export const MessageToken = createTokenByName("message", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

// "deliver_to"
export const DeliverToToken = createTokenByName("deliver_to", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const MessageTokens = [MessageToken, DeliverToToken];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case MessageToken.name:
      return "keyword";
    case DeliverToToken.name:
      return "variable";
    default:
      return null;
  }
}
