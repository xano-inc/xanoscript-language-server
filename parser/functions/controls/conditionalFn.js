import { CommentToken } from "../../../lexer/comment.js";
import { ConditionalToken, LCurly, RCurly } from "../../../lexer/control.js";
import { NewlineToken } from "../../../lexer/tokens.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function conditionalFn($) {
  return () => {
    let hasIfStatement = false;
    let hasDescription = false;
    let hasDisabled = false;
    let hasElseStatement = false;

    $.sectionStack.push("conditionalFn");
    const parent = $.CONSUME(ConditionalToken); // "conditional"
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken));
      $.OR([
        { ALT: () => $.CONSUME(CommentToken) },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasDisabled,
          ALT: () => {
            hasDisabled = true;
            $.SUBRULE($.disabledFieldAttribute);
          },
        },
        {
          GATE: () => !hasIfStatement,
          ALT: () => {
            hasIfStatement = true;
            $.SUBRULE($.conditionalIfFn);

            // as soon as we hit an else statement, we know there can be no more elif statements, so we only check for the absence of an else statement
            $.MANY1({
              GATE: () => !hasElseStatement,
              DEF: () => {
                $.AT_LEAST_ONE1(() => $.CONSUME3(NewlineToken));
                $.SUBRULE($.optionalCommentBlockFn);
                $.OR1([
                  {
                    ALT: () => {
                      hasElseStatement = true;
                      $.SUBRULE($.conditionalElseFn);
                    },
                  },
                  {
                    ALT: () => {
                      $.SUBRULE($.conditionalElifFn);
                    },
                  },
                ]);
              },
            });
          },
        },
      ]);
    });

    if (!hasIfStatement) {
      $.addMissingError(parent, "{} is missing the if statement");
    }

    $.MANY2(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RCurly); // "}"

    $.sectionStack.pop();
  };
}
