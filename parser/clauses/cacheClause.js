import { EqualToken } from "../../lexer/control.js";
import { Cachetoken } from "../../lexer/tokens.js";

/**
 * sets the cache for the query or function
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function cacheClause($) {
  return () => {
    $.sectionStack.push("cacheClause");
    const parent = $.CONSUME(Cachetoken); // "cache"
    $.CONSUME(EqualToken); // "="

    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [
        parent,
        {
          ttl: "[number]",
          input: "[boolean]",
          auth: "[boolean]",
          datasource: "[boolean]",
          ip: "[boolean]",
          "headers?": ["[string]"],
          "env?": ["[string]"],
        },
      ],
    });

    $.sectionStack.pop();
  };
}
