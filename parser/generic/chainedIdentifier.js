import { IntegerLiteral, StringLiteral } from "../../lexer/literal.js";
import { DotToken, Identifier } from "../../lexer/tokens.js";
import { ShortFormVariable } from "../../lexer/variables.js";

/**
 * to be used after a variable to reference their properties
 * like foo.bar.x[1].y[2].z
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function chainedIdentifier($) {
  return () => {
    $.MANY(() => $.SUBRULE($.singleChainedIdentifier));
  };
}

/**
 * `$` prefixed properties that are allowed without a warning, e.g.
 * `$my_var.$search` or `$my_var.$this`.
 */
const ALLOWED_DOLLAR_PROPERTIES = new Set(["$search", "$this"]);

/**
 * to be used after a variable to reference a single property depth
 * like foo.bar , foo[1] or foo["key"]
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function singleChainedIdentifier($) {
  return () => {
    $.OR([
      {
        ALT: () => {
          $.CONSUME(DotToken);
          $.OR1([
            {
              ALT: () => {
                const token = $.CONSUME(ShortFormVariable);
                if (!ALLOWED_DOLLAR_PROPERTIES.has(token.image)) {
                  $.addWarning(
                    `Using \`$\` prefixed properties '${token.image}' is discouraged.`,
                    token
                  );
                }
              },
            }, // e.g., .bar
            { ALT: () => $.CONSUME(Identifier) }, // e.g., .bar
            { ALT: () => $.CONSUME2(IntegerLiteral) }, // e.g., .3
            { ALT: () => $.CONSUME(StringLiteral) }, // e.g., ."some value"
            { ALT: () => $.SUBRULE($.bracketAccessor) }, // e.g., .["key"]
          ]);
        },
      },
      { ALT: () => $.SUBRULE1($.bracketAccessor) }, // e.g., .["key"]
    ]);
  };
}
