import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "policy"
export const PolicyToken = createTokenByName("policy", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "rule"
export const RuleToken = createTokenByName("rule", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const PolicyTokens = [PolicyToken, RuleToken];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case PolicyToken.name:
    case RuleToken.name:
      return "keyword";
    default:
      return null;
  }
}
