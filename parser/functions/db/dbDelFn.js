import { DelToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { captureFieldName } from "./captureFieldName.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbDelFn($) {
  return () => {
    $.sectionStack.push("dbDelFn");
    const fnToken = $.CONSUME(DelToken); // "delete"
    const nameToken = $.OR({
      DEF: [
        { ALT: () => $.CONSUME(Identifier) },
        { ALT: () => $.CONSUME1(StringLiteral) },
      ],
      ERR_MSG: "Expected a table name",
    });
    $.addReference("table", getVarName(nameToken), nameToken);

    const captured = {};
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          field_name: "[expression]",
          field_value: "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
        captured,
      ],
    });

    $.ACTION(() => captureFieldName($, captured));

    $.sectionStack.pop();
  };
}
