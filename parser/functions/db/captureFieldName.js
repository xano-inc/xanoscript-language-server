import { SingleQuotedStringLiteral,StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

const identifierLikeTokens = new Set([
  Identifier.name,
  StringLiteral.name,
  SingleQuotedStringLiteral.name,
]);

/**
 * Extract data object keys from captured schema and attach to last reference.
 * @param {import('../../base_parser.js').XanoBaseParser} $
 * @param {Object} captured
 */
export function captureDataKeys($, captured) {
  if (!captured.data) return;

  const dataKeys = [];
  for (const [k, v] of Object.entries(captured.data)) {
    if (k === "key" || k === "value") continue;
    const keyToken = v?.key;
    if (keyToken) {
      dataKeys.push({
        name: k,
        startOffset: keyToken.startOffset,
        endOffset: keyToken.endOffset,
      });
    }
  }
  if (dataKeys.length > 0) {
    $.setReferenceDataKeys(dataKeys);
  }
}

/**
 * Extract field_name value from captured schema object and attach to last reference.
 * Only captures when the value is an identifier or string literal (not a variable expression).
 * @param {import('../../base_parser.js').XanoBaseParser} $
 * @param {Object} captured
 */
export function captureFieldName($, captured) {
  if (!captured.field_name) return;

  const keyOffset = captured.field_name.key?.startOffset;
  if (keyOffset == null) return;

  const tokens = $.input;
  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].startOffset === keyOffset) {
      // tokens[i] = "field_name" key, tokens[i+1] = "=", tokens[i+2] = value
      const valueToken = tokens[i + 2];
      if (valueToken && identifierLikeTokens.has(valueToken.tokenType.name)) {
        $.setReferenceFieldName(
          getVarName(valueToken),
          valueToken.startOffset,
          valueToken.endOffset
        );
      }
      break;
    }
  }
}
