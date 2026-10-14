import { CallToken, FunctionToken } from "../../../lexer/function.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { DotToken, Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function functionCallFn($) {
  const requiredAttrs = [];
  const optionalAttrs = ["input", "description", "disabled"];

  return () => {
    $.sectionStack.push("functionCallFn");
    $.CONSUME(FunctionToken); // "function"
    $.CONSUME(DotToken); // "."
    const fnToken = $.CONSUME(CallToken); // "call"

    const nameToken = $.OR([
      { ALT: () => $.CONSUME(Identifier) },
      { ALT: () => $.CONSUME1(StringLiteral) },
    ]);
    $.addReference("function", getVarName(nameToken), nameToken);

    $.SUBRULE($.functionAttrReq, {
      ARGS: [
        fnToken,
        requiredAttrs,
        optionalAttrs,
        {
          allowObject: ["input"],
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
