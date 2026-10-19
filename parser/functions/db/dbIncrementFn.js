import { IncrementToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { captureFieldName } from "./captureFieldName.js";
import { addonSchema } from "./schema.js";

/**
 * db.increment <table> { where, field_name, value, ... } as $var
 *
 * Atomically adds `value` (negative decrements) to the numeric column
 * `field_name` on every row matching `where`. The key set must match the
 * server-side kind schema exactly, or the editor reports false diagnostics.
 *
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function dbIncrementFn($) {
  return () => {
    $.sectionStack.push("dbIncrementFn");
    const fnToken = $.CONSUME(IncrementToken); // "increment"
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
          "description?": "[string]",
          "disabled?": "[boolean]",
          where: "[query]",
          field_name: "[expression]",
          value: "[expression]",
          "return?": {
            "type?": ["list", "count"],
          },
          "output?": ["[string]"],
          "addon?": [addonSchema],
          "mock?": { "![string]": "[expression]" },
        },
        captured,
      ],
    });

    $.ACTION(() => {
      captureFieldName($, captured);
      // Extract addon name references (mirrors db.query)
      if (captured.addon?.value && Array.isArray(captured.addon.value)) {
        for (const item of captured.addon.value) {
          const nameEntry = item.name;
          if (nameEntry?.value) {
            $.addReference(
              "function",
              getVarName(nameEntry.value),
              nameEntry.value
            );
          }
        }
      }
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
