import { ExclamationToken } from "../../lexer/cast.js";
import { ColonToken, PipeToken } from "../../lexer/control.js";
import { Identifier, NewlineToken } from "../../lexer/tokens.js";
import { filterNames, querySearchFilterNames } from "./filterNames.js";

/**
 * Represents a filter function in XanoScript
 *
 * Handles expression filters and query search filters
 * e.g. |filterName:arg1:arg2 or |!filterName:arg1:arg2 (disabled)
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function filterFn($) {
  return (options = {}, state = null) => {
    $.OR([
      {
        ALT: () => {
          $.CONSUME(NewlineToken);
          $.CONSUME(PipeToken);
        },
      },
      {
        ALT: () => $.CONSUME1(PipeToken),
      },
    ]);

    const allowedFilters =
      options.allowQueryExpression === true
        ? querySearchFilterNames
        : filterNames;

    // Handle either regular or disabled filter
    $.OPTION(() => $.CONSUME(ExclamationToken));
    const filterToken = $.CONSUME(Identifier);

    if (!allowedFilters.includes(filterToken.image)) {
      $.addInvalidValueError(
        filterToken,
        `Unknown filter function '${filterToken.image}'`
      );
    }

    // Filter arguments do not absorb subsequent `|filter` tokens — those
    // belong to the outer expression's filter chain. Without this, a long
    // sibling chain like `[]|push:1|push:2|push:3` parses as deep right-
    // nested SUBRULEs and overflows the stack. Explicit nesting still works
    // via parentheses (`|f:(x|g:y)`), since the parens branch in
    // expressionFn restores `allowFilter: true`.
    // allowBareIdentifier lets property-name args like `|get:items:null`
    // parse as Identifier without requiring quotes or backticks.
    const argOptions = {
      ...options,
      allowFilter: false,
      allowBareIdentifier: true,
    };
    $.MANY1(() => {
      $.CONSUME(ColonToken);
      $.SUBRULE($.expressionFn, { ARGS: [filterToken, argOptions, state] });
    });
  };
}
