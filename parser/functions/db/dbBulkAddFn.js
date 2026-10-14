import { AddToken } from "../../../lexer/db.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function dbBulkAddFn($) {
  return () => {
    $.sectionStack.push("dbBulkAddFn");
    const fnToken = $.CONSUME(AddToken); // "add"
    const nameToken = $.OR({
      DEF: [
        { ALT: () => $.CONSUME(Identifier) },
        { ALT: () => $.CONSUME1(StringLiteral) },
      ],
      ERR_MSG: "Expected a table name",
    });
    $.addReference("table", getVarName(nameToken), nameToken);
    const defined = {};
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          "items?": "[expression]",
          "allow_id_field?": "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
        defined,
      ],
    });

    // TODO: fix expressionFn so we can introspect items so
    // we can warn about "id" field usage
    /**
    // if allow_id_field is not defined, or is false
    const allow_id_field = get(defined, "allow_id_field.value");
    // Warn if "id" field is used in items without allow_id_field being true
    if (!allow_id_field && defined.items) {
      const hasId = defined.items.value.some((item) => item.id);
      if (hasId) {
        $.addWarning(
          fnToken,
          'Using "id" field in db.bulk.add without setting allow_id_field to true may cause errors.'
        );
      }
    }
    */

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });

    $.sectionStack.pop();
  };
}
