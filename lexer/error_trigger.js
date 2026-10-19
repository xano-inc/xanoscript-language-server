import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "error_trigger"
export const ErrorTriggerToken = createTokenByName("error_trigger", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ErrorTriggerTokens = [ErrorTriggerToken];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case ErrorTriggerToken.name:
      return "keyword";
    default:
      return null;
  }
}
