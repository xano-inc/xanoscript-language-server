import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "run"
export const RunToken = createTokenByName("run", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "job"
export const JobToken = createTokenByName("job", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "service"
export const ServiceToken = createTokenByName("service", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const RunTokens = [RunToken, JobToken, ServiceToken];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case RunToken.name:
    case JobToken.name:
    case ServiceToken.name:
      return "keyword";
    default:
      return null;
  }
}
