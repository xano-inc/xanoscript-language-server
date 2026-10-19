import { EqualToken } from "../../lexer/control.js";
import { IntegerLiteral } from "../../lexer/literal.js";
import { HistoryToken } from "../../lexer/tokens.js";

/**
 * Parses the history clause.
 *
 * `history` mirrors the backend serializer (the Xano backend
 * helper/script/transform via `redacted`): the value is
 * `false` (disabled), `"inherit"` (hand-authored sentinel), `"all"` (unbounded),
 * or ANY non-negative integer message limit — not a fixed set of magic numbers.
 * It is split across two OR branches because `schemaParseEnumFn` refuses an enum
 * that mixes constants (`false`/`"inherit"`/`"all"`) with a generic numeric type:
 * an integer literal is consumed directly, every other value by the sentinel
 * enum (which keeps emitting the existing "must be one of …" error). The limit
 * is an integer message count, so a float is intentionally NOT accepted.
 * `IGNORE_AMBIGUITIES` steers an integer literal to the number branch, since both
 * branches can begin with one.
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function historyClause($) {
  return () => {
    $.sectionStack.push("historyClause");
    const parent = $.CONSUME(HistoryToken); // "history"
    $.CONSUME(EqualToken); // "="
    $.OR({
      IGNORE_AMBIGUITIES: true,
      DEF: [
        // any non-negative integer message limit (e.g. 50, 100, 250)
        { ALT: () => $.CONSUME(IntegerLiteral) },
        // the non-numeric sentinels: false | "inherit" | "all"
        {
          ALT: () =>
            $.SUBRULE($.schemaParseEnumFn, {
              ARGS: [parent, [false, "inherit", "all"]],
            }),
        },
      ],
    });

    $.sectionStack.pop();
  };
}
