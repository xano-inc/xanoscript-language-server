import { AddToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { addonSchema } from "./schema.js";
/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbAddFn($) {
  return () => {
    $.sectionStack.push("dbAddFn");
    const fnToken = $.CONSUME(AddToken); // "add"

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
          data: { "[string]": "[expression]" },
          "description?": "[string]",
          "disabled?": "[boolean]",
          "enforce_hidden_fields?": "[boolean]",
          "addon?": [addonSchema],
          "mock?": { "![string]": "[expression]" },
          "output?": ["[string]"],
        },
      ],
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
