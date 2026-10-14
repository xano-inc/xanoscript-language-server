import { UpdateToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbBulkUpdateFn($) {
  return () => {
    $.sectionStack.push("dbBulkUpdateFn");
    const fnToken = $.CONSUME(UpdateToken); // "update"
    const nameToken = $.OR({
      DEF: [
        { ALT: () => $.CONSUME(Identifier) },
        { ALT: () => $.CONSUME1(StringLiteral) },
      ],
      ERR_MSG: "Expected a table name",
    });
    $.addReference("table", getVarName(nameToken), nameToken);

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          "items?": "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
      ],
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });

    $.sectionStack.pop();
  };
}
