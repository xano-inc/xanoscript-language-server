import { LParent, RParent } from "../../../lexer/control.js";
import { ToBeWithinToken } from "../../../lexer/expect.js";
import { NewlineToken } from "../../../lexer/tokens.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function workflowExpectToBeWithinFn($) {
  const requiredAttrs = ["min", "max"];
  const optionalAttrs = ["description", "disabled"];

  return () => {
    $.sectionStack.push("workflowExpectToBeWithinFn");
    const fnToken = $.CONSUME(ToBeWithinToken); // "to_be_within"
    $.CONSUME(LParent); // "("
    $.SUBRULE($.expressionFn); // "$foo|get:bar:null"
    $.MANY(() => $.CONSUME(NewlineToken)); // allow newlines between the expression and the attributes
    $.CONSUME(RParent); // ")"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
