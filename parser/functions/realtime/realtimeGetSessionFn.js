import { GetSessionToken } from "../../../lexer/realtime.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function realtimeGetSessionFn($) {
  // realtime.get_session as $session
  return () => {
    const requiredAttrs = [];
    const optionalAttrs = ["description", "disabled"];

    $.sectionStack.push("realtimeGetSessionFn");
    const fnToken = $.CONSUME(GetSessionToken); // "get_session"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
