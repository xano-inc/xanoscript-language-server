import { TruncateToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbTruncateFn($) {
  return () => {
    $.sectionStack.push("dbTruncateFn");
    const fnToken = $.CONSUME(TruncateToken); // "truncate"
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
          "reset?": "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
      ],
    });

    $.sectionStack.pop();
  };
}
