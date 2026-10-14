import { LambdaToken } from "../../../lexer/api.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function apiLambdaFn($) {
  const requiredAttrs = ["code"];
  const optionalAttrs = ["description", "disabled", "timeout"];

  return () => {
    $.sectionStack.push("apiLambdaFn");
    const fnToken = $.CONSUME(LambdaToken); // "lambda"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
