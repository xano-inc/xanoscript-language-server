import { EditToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { captureDataKeys,captureFieldName } from "./captureFieldName.js";
import { addonSchema } from "./schema.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbEditFn($) {
  return () => {
    $.sectionStack.push("dbEditFn");
    const fnToken = $.CONSUME(EditToken); // "edit"
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
          data: { "[string]": "[expression]" },
          "description?": "[string]",
          "disabled?": "[boolean]",
          "enforce_hidden_fields?": "[boolean]",
          "output?": ["[string]"],
          "addon?": [addonSchema],
          "mock?": { "![string]": "[expression]" },
        },
        captured,
      ],
    });

    $.ACTION(() => {
      captureFieldName($, captured);
      captureDataKeys($, captured);
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
