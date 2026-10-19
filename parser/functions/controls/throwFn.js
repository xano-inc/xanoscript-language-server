import { ThrowToken } from "../../../lexer/control.js";
import { IntegerLiteral } from "../../../lexer/literal.js";

/**
 * `status` is the HTTP status an UNCAUGHT throw answers with (cloud-client
 * mvp:throw_error, kind schema statement/throw.yaml `status?: static:int`).
 * It is a static integer from 100 to 599, never an expression, so a variable
 * or an out-of-range number is caught in the editor rather than at run time.
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
function statusValue($) {
  const token = $.CONSUME(IntegerLiteral, {
    ERR_MSG: "status must be a whole number from 100 to 599",
  });
  const value = Number(token.image);
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    $.addInvalidValueError(
      token,
      `Invalid status ${token.image}. Must be a whole number from 100 to 599`,
    );
  }
}

/**
 * represent $var.x or $x, the only format accepting an assigment
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function throwFn($) {
  const requiredAttrs = ["value", "name"];
  const optionalAttrs = ["description", "disabled", "status"];

  return () => {
    $.sectionStack.push("throw");
    const tokenFn = $.CONSUME(ThrowToken); // "throw"
    // value is a required field
    $.SUBRULE($.functionAttrReq, {
      ARGS: [
        tokenFn,
        requiredAttrs,
        optionalAttrs,
        { types: { status: statusValue } },
      ],
    });

    $.sectionStack.pop();
  };
}
