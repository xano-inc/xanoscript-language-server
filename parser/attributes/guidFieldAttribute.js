import { EqualToken } from "../../lexer/control.js";
import { StringLiteral } from "../../lexer/literal.js";
import { GuidToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function guidFieldAttribute($) {
  return () => {
    $.sectionStack.push("guidFieldAttribute");
    $.CONSUME(GuidToken); // "guid"
    $.CONSUME(EqualToken); // "="
    $.CONSUME(StringLiteral); // e.g., "tgGYuUFKbBz4_6DIkDR5hUUCRno"
    $.sectionStack.pop();
  };
}
