import { EqualToken } from "../../lexer/control.js";
import { Mesh0Token } from "../../lexer/tokens.js";

/**
 * The value set of one mesh0 setting, `{logging, statements}`, shared by the
 * object/container `mesh0 = {...}` clause and each run type of a branch
 * document's `mesh0` block (`branch_parser.js`).
 *
 * Mirrors the platform's mesh0 settings: `logging` is the trace detail
 * (`"inherit"` defers to the next level), `statements` the per-run statement
 * span cap. Unlimited is written `"all"`, as `history` writes it; the platform
 * stores it as `-1`. Both keys are optional, and a missing one inherits.
 */
export const MESH0_SETTING_SCHEMA = {
  "logging?": ["inherit", "minimal", "light", "full"],
  "statements?": [100, 1000, 10000, "all"],
};

/**
 * Parses the `mesh0 = {logging: "light", statements: 1000}` setting of an
 * object (query, function, task, tool, middleware, trigger, prompt, resource)
 * or a container (api_group, mcp_server, channel, realtime_server). It sits
 * beside `history`. A container presents the same two keys; the platform maps
 * them to its type-prefixed fields (`query_logging`, `tool_statements`, ...).
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mesh0Clause($) {
  return () => {
    $.sectionStack.push("mesh0Clause");
    const parent = $.CONSUME(Mesh0Token); // "mesh0"
    $.CONSUME(EqualToken); // "="

    const captured = {};
    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [parent, MESH0_SETTING_SCHEMA, captured],
    });

    // Both keys are optional, but an empty setting says nothing.
    $.ACTION(() => {
      if (Object.keys(captured).length === 0) {
        $.addMissingError(
          parent,
          "{} requires at least one of: logging, statements",
        );
      }
    });

    $.sectionStack.pop();
  };
}
