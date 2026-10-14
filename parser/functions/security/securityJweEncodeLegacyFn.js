import { EqualToken, LCurly, RCurly } from "../../../lexer/control.js";
import { JweEncodeLegacyToken } from "../../../lexer/security.js";
import { Identifier, NewlineToken } from "../../../lexer/tokens.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function securityJweEncodeLegacyFn($) {
  return () => {
    $.sectionStack.push("securityJweEncodeLegacyFn");
    const fnToken = $.CONSUME(JweEncodeLegacyToken); // "jwe_encode_legacy"
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken));
      $.CONSUME1(Identifier); // "field_name"
      $.CONSUME(EqualToken); // "="
      $.SUBRULE($.expressionFn);
    });
    $.MANY1(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RCurly); // "}"
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
