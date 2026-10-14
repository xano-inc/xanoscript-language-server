import { DotToken } from "../lexer/tokens.js";
import { LongFormVariable,ShortFormVariable } from "../lexer/variables.js";
import { BLACKLISTED_VARIABLE_NAMES } from "./generic/assignableVariableProperty.js";

const SHORT_FORM = ShortFormVariable.name;
const LONG_FORM = LongFormVariable.name;
const DOT = DotToken.name;

const BUILTIN_NAMES = new Set(BLACKLISTED_VARIABLE_NAMES.map((n) => `$${n}`));
// Also skip $$ (temporary variable)
BUILTIN_NAMES.add("$$");

/**
 * Scan the token stream for variable usages (ShortFormVariable and LongFormVariable tokens).
 * Excludes tokens at declaration offsets and built-in variable names.
 * @param {import('chevrotain').IToken[]} tokens - The token stream
 * @param {Array<{name: string, startOffset: number | null}>} declarations - Known declaration sites
 * @returns {Array<{name: string, startOffset: number, endOffset: number}>}
 */
export function scanVariableUsages(tokens, declarations) {
  // Build set of declaration offsets to skip
  const declOffsets = new Set();
  for (const decl of declarations) {
    if (decl.startOffset != null) {
      declOffsets.add(decl.startOffset);
    }
  }

  const usages = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const typeName = token.tokenType.name;

    if (typeName === SHORT_FORM) {
      // Skip chained property accessors like `$db.my_table.$search`, where the
      // `$search` token is a property name in a member-access chain, not a
      // standalone variable reference. Such tokens are immediately preceded by
      // a Dot token (see chainedIdentifier's singleChainedIdentifier rule).
      if (i > 0 && tokens[i - 1].tokenType.name === DOT) continue;
      // Skip if this is a declaration site
      if (declOffsets.has(token.startOffset)) continue;
      // Skip built-in variable names
      if (BUILTIN_NAMES.has(token.image)) continue;

      usages.push({
        name: token.image,
        startOffset: token.startOffset,
        endOffset: token.endOffset,
      });
    } else if (typeName === LONG_FORM) {
      // $var.foo → resolve to $foo
      // Next tokens should be Dot + Identifier
      if (i + 2 < tokens.length) {
        const identToken = tokens[i + 2];
        const name = `$${identToken.image}`;

        // Skip if this is a declaration site (check the identifier token)
        if (declOffsets.has(identToken.startOffset)) continue;

        usages.push({
          name,
          startOffset: token.startOffset,
          endOffset: identToken.endOffset,
        });
      }
    }
  }

  return usages;
}
