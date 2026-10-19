import { EqualToken } from "../../lexer/control.js";
import { MiddlewareToken } from "../../lexer/tokens.js";
import { getVarName } from "../generic/utils.js";

/**
 * response = $entries
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function middlewareClause($) {
  return () => {
    $.sectionStack.push("middlewareClause");

    const parent = $.CONSUME(MiddlewareToken); // "middleware"
    $.CONSUME(EqualToken); // "="
    const captured = {};
    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [
        parent,
        {
          "pre?": [
            {
              name: "[string]",
              "active?": "[boolean]",
              "required?": "[boolean]",
            },
          ],
          "post?": [
            {
              name: "[string]",
              "active?": "[boolean]",
              "required?": "[boolean]",
            },
          ],
        },
        captured,
      ],
    });

    $.ACTION(() => {
      for (const phase of ["pre", "post"]) {
        const items = captured[phase]?.value;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const nameEntry = item.name;
          if (!nameEntry?.value) continue;
          const token = nameEntry.value;
          $.addReference("middleware", getVarName(token), token);
        }
      }
    });

    $.sectionStack.pop();
  };
}
