import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// realtime
export const RealtimeToken = createTokenByName("realtime", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// get_session
export const GetSessionToken = createTokenByName("get_session", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// publish
export const PublishToken = createTokenByName("publish", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const RealtimeStatementTokens = [
  RealtimeToken,
  GetSessionToken,
  PublishToken,
];

export function mapTokenToType(token) {
  switch (token) {
    case RealtimeToken.name:
    case GetSessionToken.name:
    case PublishToken.name:
      return "function";
    default:
      return null;
  }
}
