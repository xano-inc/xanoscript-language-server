import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// "channel_trigger"
export const ChannelTriggerToken = createTokenByName("channel_trigger", {
  longer_alt: Identifier,
  categories: [Identifier], // could also be an identifier
});

export const ChannelTriggerTokens = [ChannelTriggerToken];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case ChannelTriggerToken.name:
      return "keyword";
    default:
      return null;
  }
}
