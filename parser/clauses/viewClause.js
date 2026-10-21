import { EqualToken } from "../../lexer/control.js";
import { ViewToken } from "../../lexer/tokens.js";

/**
 * view = {
 *   "pending applications": {
 *     search: $db.status == "pending"
 *     sort  : {id: "asc"}
 *     id    : "9ed7daad-682f-455e-bf02-ca53444cd429"
 *   }
 * }
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function viewClause($) {
  return () => {
    $.sectionStack.push("viewClause");
    const parent = $.CONSUME(ViewToken); // "view"
    $.CONSUME(EqualToken); // "="
    const captured = {};
    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [
        parent,
        {
          // The platform writes each of alias/term/search/sort/hide only
          // when the view has it.
          "[string]": {
            "term?": "[string]",
            "search?": "[query]",
            "hide?": ["[string]"],
            "sort?": { "[string]": ["asc", "desc", "rand"] },
            id: "[string]",
            "alias?": "[string]",
          },
        },
        captured,
      ],
    });

    // each key is the view name, ensure it has some criteria
    for (const viewName in captured) {
      const hasTerm = !!captured[viewName].term;
      const hasSearch = !!captured[viewName].search;
      const hasSort = !!captured[viewName].sort;
      if (!hasTerm && !hasSearch && !hasSort && !captured[viewName].hide) {
        $.addMissingError(
          parent,
          `view ${viewName} must have either a term, search, sort or hide criteria`,
        );
      }
    }

    $.sectionStack.pop();
  };
}
