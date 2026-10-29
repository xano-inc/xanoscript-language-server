import { EqualToken } from "../../lexer/control.js";
import { Mesh0Token } from "../../lexer/tokens.js";

/**
 * The value set of one mesh0 setting, `{logging}`, shared by the
 * object/container `mesh0 = {...}` clause and each run type of a branch
 * document's `mesh0` block (`branch_parser.js`).
 *
 * Mirrors the platform's mesh0 settings: `logging` is the trace detail
 * (`"inherit"` defers to the next level) and is required. The per-run
 * statement span cap is not a mesh0 key; the platform takes it from the
 * request-history `history` setting, so a `statements` key is invalid.
 */
export const MESH0_SETTING_SCHEMA = {
  logging: ["inherit", "minimal", "light", "full"],
};

/**
 * Parses the `mesh0 = {logging: "light"}` setting of an object (query,
 * function, task, tool, middleware, trigger, prompt, resource) or a container
 * (api_group, mcp_server, channel, realtime_server). It sits beside
 * `history`. A container presents the same key; the platform maps it to its
 * type-prefixed field (`query_logging`, `tool_logging`, ...).
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mesh0Clause($) {
  return () => {
    $.sectionStack.push("mesh0Clause");
    const parent = $.CONSUME(Mesh0Token); // "mesh0"
    $.CONSUME(EqualToken); // "="

    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [parent, MESH0_SETTING_SCHEMA],
    });

    $.sectionStack.pop();
  };
}
