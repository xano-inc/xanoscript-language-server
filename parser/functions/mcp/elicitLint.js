import { PipeToken } from "../../../lexer/control.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { getVarName } from "../../generic/utils.js";

// The write-before-elicit lint (plan KTD9). `mcp.elicit` asks the client for
// input by ending the request with `input_required`; the client then RETRIES
// the whole request with the answer, so every statement before the elicit runs
// once per round trip. A write placed before the first elicit repeats.
//
// The mutating set is deliberately conservative: the `db.*` writes, raw SQL
// (`db.direct_query`, `db.external.<driver>.direct_query`), an `api.request`
// whose method is not a plain literal GET/HEAD, `util.send_email`, and
// `function.run` (which may write anything).

const DB_WRITES = [
  "add",
  "add_or_edit",
  "edit",
  "patch",
  "del",
  "delete",
  "truncate",
  "increment",
  "bulk",
  // raw SQL may write
  "direct_query",
  "external",
];

const READ_METHODS = ["GET", "HEAD"];

/**
 * The name of the mutating statement spanning `input[start..end]`, or null.
 * Reads tokens in place: this runs for every stack statement on every parse.
 * @param {import('chevrotain').IToken[]} input the parser's token vector
 * @param {number} start index of the statement's first token
 * @param {number} end index of the statement's last token
 * @returns {string|null}
 */
export function mutatingStatementName(input, start, end) {
  const ns = input[start]?.image;
  const dot = input[start + 1]?.image;
  const name = input[start + 2]?.image;
  if (dot !== "." || !ns || !name) return null;

  if (ns === "db" && DB_WRITES.includes(name)) return `db.${name}`;
  if (ns === "util" && name === "send_email") return "util.send_email";
  if (ns === "function" && name === "run") return "function.run";

  if (ns === "api" && name === "request") {
    for (let i = start + 3; i <= end - 2; i++) {
      if (input[i].image !== "method" || input[i + 1].image !== "=") continue;
      const value = input[i + 2];
      // a filtered or compound method ("GET"|replace:...) is not a plain GET
      const isPlain = input[i + 3]?.tokenType !== PipeToken;
      if (
        isPlain &&
        value.tokenType === StringLiteral &&
        READ_METHODS.includes(getVarName(value).toUpperCase())
      ) {
        return null;
      }
      return "api.request";
    }
    // no method: api.request defaults to GET
    return null;
  }

  return null;
}

/**
 * Record a statement that just finished parsing (called from nakedStackFn).
 * @param {import('../../base_parser.js').XanoBaseParser} $
 * @param {number} startIdx lexer index of the statement's first token
 */
export function recordStatement($, startIdx) {
  const name = mutatingStatementName($.input, startIdx, $.exportLexerState());
  if (name) {
    $.__mcpElicitLint.mutations.push({ name, token: $.input[startIdx] });
  }
}

/**
 * Called when an `mcp.elicit` is parsed: warn when a write ran since the
 * previous elicit (or since the start of the stack, for the first one).
 * @param {import('../../base_parser.js').XanoBaseParser} $
 * @param {import('chevrotain').IToken} elicitToken
 */
export function checkElicit($, elicitToken) {
  const lint = $.__mcpElicitLint;
  const first = lint.mutations[lint.checked];
  lint.checked = lint.mutations.length;
  if (!first) return;

  $.addWarning(
    `\`${first.name}\` runs before this mcp.elicit. The client retries the whole request with each answer, so every statement before the elicit runs again on each round trip. Move writes after the last mcp.elicit.`,
    elicitToken,
  );
}
