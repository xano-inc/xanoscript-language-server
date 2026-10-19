import { SchemaToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbSchemaFn($) {
  return () => {
    const requiredAttrs = [];
    const optionalAttrs = ["description", "disabled", "path"];

    $.sectionStack.push("dbSchemaFn");
    const fnToken = $.CONSUME(SchemaToken); // "schema"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(Identifier) },
      { ALT: () => $.CONSUME1(StringLiteral) },
    ]);
    $.addReference("table", getVarName(nameToken), nameToken);
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
