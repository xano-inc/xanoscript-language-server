import { GetToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { captureFieldName } from "./captureFieldName.js";
import { addonSchema } from "./schema.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbGetFn($) {
  return () => {
    $.sectionStack.push("dbGetFn");
    const fnToken = $.CONSUME(GetToken); // "get"
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
          "output?": ["[string]"],
          "lock?": "[boolean]",
          "addon?": [addonSchema],
          "mock?": { "![string]": "[expression]" },
        },
        captured,
      ],
    });

    $.ACTION(() => captureFieldName($, captured));

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
