import { Identifier } from "../lexer/identifier.js";
import { DotToken } from "../lexer/tokens.js";
import { ShortFormVariable } from "../lexer/variables.js";

const SHORT_FORM = ShortFormVariable.name;
const DOT = DotToken.name;
const IDENTIFIER = Identifier.name;

/**
 * Scan the token stream for `$db.<table>.<column>` accessor chains and emit
 * cross-file table references, so the workspace validator can check that the
 * referenced table (and, when statically known, the column) actually exists.
 *
 * Emitted references match the shape consumed by {@link crossFileValidate}:
 * `{ refType: "table", name, startOffset, endOffset }` with an optional
 * `fieldName` (+ offsets) when the column is a plain identifier.
 *
 * `$`-prefixed properties (e.g. `$db.t.$search`, `$db.t.$this`) are pseudo /
 * dynamic columns, not real columns, so only the table is validated for them.
 *
 * @param {import('chevrotain').IToken[]} tokens - The token stream
 * @returns {Array<{refType: string, name: string, startOffset: number, endOffset: number, fieldName?: string, fieldNameStartOffset?: number, fieldNameEndOffset?: number}>}
 */
export function scanDbReferences(tokens) {
  const references = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.tokenType.name !== SHORT_FORM || token.image !== "$db") continue;

    // Expect `$db . <table>` where <table> is a plain identifier.
    const dot = tokens[i + 1];
    const tableToken = tokens[i + 2];
    if (
      !dot ||
      dot.tokenType.name !== DOT ||
      !tableToken ||
      tableToken.tokenType.name !== IDENTIFIER
    ) {
      continue;
    }

    const ref = {
      refType: "table",
      name: tableToken.image,
      startOffset: tableToken.startOffset,
      endOffset: tableToken.endOffset,
    };

    // Optionally capture a plain-identifier column: `. <column>`.
    const colDot = tokens[i + 3];
    const colToken = tokens[i + 4];
    if (
      colDot &&
      colDot.tokenType.name === DOT &&
      colToken &&
      colToken.tokenType.name === IDENTIFIER
    ) {
      ref.fieldName = colToken.image;
      ref.fieldNameStartOffset = colToken.startOffset;
      ref.fieldNameEndOffset = colToken.endOffset;
    }

    references.push(ref);
    // Advance past the table token; the column (if any) can't start a new $db.
    i += 2;
  }

  return references;
}
