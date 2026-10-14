import { DebugLogToken } from "./debug.js";
import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// datadog
export const DatadogToken = createTokenByName("datadog", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// datadog.log reuses the existing "log" token from debug
export { DebugLogToken as DatadogLogToken };

// datadog.log_bulk
export const DatadogLogBulkToken = createTokenByName("log_bulk", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// datadog.metric
export const DatadogMetricToken = createTokenByName("metric", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// datadog.metric_bulk
export const DatadogMetricBulkToken = createTokenByName("metric_bulk", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// Order matters: longer patterns must come before shorter prefixes
// (e.g. metric_bulk before metric) so the lexer matches them correctly.
// Note: `log_bulk` ordering vs the reused `log` token depends on
// DatadogTokens being registered before DebugTokens in lexer/tokens.js.
export const DatadogTokens = [
  DatadogToken,
  DatadogLogBulkToken,
  DatadogMetricBulkToken,
  DatadogMetricToken,
];

/**
 * Maps a token name to a type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case DatadogToken.name:
    case DatadogLogBulkToken.name:
    case DatadogMetricToken.name:
    case DatadogMetricBulkToken.name:
      return "function";
    default:
      return null;
  }
}
