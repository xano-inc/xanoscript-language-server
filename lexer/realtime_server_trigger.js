import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "realtime_server_trigger"
export const RealtimeServerTriggerToken = createTokenByName(
  "realtime_server_trigger",
  {
    longer_alt: Identifier,
    categories: [Identifier], // could also be an identifier
  }
);

// "realtime_server" (parent-reference keyword used by realtimeServerClause).
// longer_alt lists the trigger token so `realtime_server_trigger` wins over the
// shorter `realtime_server` prefix, AND Identifier so a name that merely EXTENDS
// the keyword (e.g. `realtime_server_0`, the default scaffold name) tokenizes as
// one identifier instead of keyword + leftover `_0`. longer_alt is not
// transitive, so Identifier must be listed here directly — matching the
// [ServerDetailsToken, Identifier] precedent in channel.js.
export const RealtimeServerToken = createTokenByName("realtime_server", {
  longer_alt: [RealtimeServerTriggerToken, Identifier],
  categories: [Identifier], // could also be an identifier
});

export const RealtimeServerTriggerTokens = [
  RealtimeServerTriggerToken,
  RealtimeServerToken,
];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case RealtimeServerTriggerToken.name:
    case RealtimeServerToken.name:
      return "keyword";
    default:
      return null;
  }
}
