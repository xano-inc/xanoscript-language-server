import { EqualToken, LCurly, RCurly } from "../../../lexer/control.js";
import { JweDecodeLegacyToken } from "../../../lexer/security.js";
import { Identifier, NewlineToken } from "../../../lexer/tokens.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function securityJweDecodeLegacyFn($) {
  return () => {
    $.sectionStack.push("securityJweDecodeLegacyFn");
    const fnToken = $.CONSUME(JweDecodeLegacyToken); // "jwe_decode_legacy"
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
