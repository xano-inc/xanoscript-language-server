import { LParent, RParent } from "../../../lexer/control.js";
import { NewlineToken } from "../../../lexer/tokens.js";
import { PreconditionToken } from "../../../lexer/util.js";

/**
 * precondition {
 *   error_type = "standard"
 *   error = "Something went wrong"
 * } as x6
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function preconditionFn($) {
  return () => {
    $.sectionStack.push("preconditionFn");
    const tokenFn = $.CONSUME(PreconditionToken); // "precondition"
    $.CONSUME(LParent);
    $.MANY(() => $.CONSUME(NewlineToken));
    $.SUBRULE($.expressionFn);
    $.MANY1(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RParent);
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        tokenFn,
        {
          "description?": "[string]",
          "disabled?": "[boolean]",
          "payload?": "[expression]",
          "error?": "[expression]",
          "error_type?": [
            "standard",
            "notfound",
            "accessdenied",
            "toomanyrequests",
            "unauthorized",
            "badrequest",
            "inputerror",
          ],
        },
      ],
    });
    $.sectionStack.pop();
  };
}
