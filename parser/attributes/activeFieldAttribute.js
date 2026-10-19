import { EqualToken } from "../../lexer/control.js";
import { ActiveToken } from "../../lexer/realtime_trigger.js";
import { FalseToken, TrueToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function activeFieldAttribute($) {
  return () => {
    $.sectionStack.push("activeFieldAttribute");
    $.CONSUME(ActiveToken); // "active"
    $.CONSUME(EqualToken); // "="
    $.OR([
      { ALT: () => $.CONSUME(TrueToken) }, // e.g., true,
      { ALT: () => $.CONSUME(FalseToken) }, // e.g., false
    ]);
    $.sectionStack.pop();
  };
}
