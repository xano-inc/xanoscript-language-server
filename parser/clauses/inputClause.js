import { MismatchedTokenException } from "chevrotain";
import { LCurly, RCurly } from "../../lexer/control.js";
import { InputToken, NewlineToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function inputClause($) {
  // `fields` collects the top-level fields (not nested object schema fields),
  // keyed by name: { typeToken, nameToken, iterable }
  return (fields = {}) => {
    $.sectionStack.push("inputClause");

    let hasStatement = false;
    let hasNewLine = false;

    $.CONSUME(InputToken); // "input"
    // unlike schema, input can be mentioned without any fields
    $.OPTION(() => {
      $.CONSUME(LCurly); // "{"
      $.MANY(() => {
        $.MANY1(() => {
          $.CONSUME1(NewlineToken);
          hasNewLine = true;
        }); // at least one new line
        $.SUBRULE($.optionalCommentBlockFn);

        $.OR([
          {
            ALT: () =>
              $.SUBRULE($.objectColumnDefinition, { ARGS: [fields] }),
          },
          {
            ALT: () => $.SUBRULE($.enumColumnDefinition, { ARGS: [fields] }),
          },
          {
            ALT: () =>
              $.SUBRULE($.columnDefinition, {
                ARGS: [{ include_file: true }, fields],
              }),
          },
          {
            ALT: () => $.SUBRULE($.dbLinkColumnDefinition),
          },
        ]);

        if (hasStatement && !hasNewLine) {
          $.SAVE_ERROR(
            new MismatchedTokenException(
              "Each statement in the input clause must be on a new line",
              $.LA(0),
            ),
          );
        }

        hasNewLine = false;
        hasStatement = true;
      });
      $.MANY2(() => $.CONSUME2(NewlineToken)); // can have new lines at the end of the input clause
      $.CONSUME(RCurly); // "}"
    });
    $.sectionStack.pop();
  };
}
