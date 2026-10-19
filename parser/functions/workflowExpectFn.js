import { ExpectToken } from "../../lexer/expect.js";
import { DotToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function workflowExpectFn($) {
  return () => {
    $.sectionStack.push("workflowExpect");
    const expectToken = $.CONSUME(ExpectToken); // "expect"

    // Validate that expect statements are only used in allowed contexts
    const validContexts = ["workflowTestDeclaration", "testClause"];
    const isInValidContext = validContexts.some((context) =>
      $.sectionStack.includes(context),
    );

    if (!isInValidContext) {
      $.addInvalidValueError(
        expectToken,
        "expect statements can only be used within workflow_test or test contexts",
      );
    }

    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.workflowExpectWithArgumentsFn) }, // "expect.to_equal, expect.to_start_with, etc."
      { ALT: () => $.SUBRULE($.workflowExpectWithoutArgumentsFn) }, // "expect.to_be_true, expect.to_be_defined, etc."
      { ALT: () => $.SUBRULE($.workflowExpectToThrowFn) }, // "expect.to_throw"
      { ALT: () => $.SUBRULE($.workflowExpectToBeWithinFn) }, // "expect.to_be_within"
    ]);
    $.sectionStack.pop();
  };
}
