import { RealtimeToken } from "../../lexer/realtime.js";
import { DotToken } from "../../lexer/tokens.js";

/**
 * realtime.get_session
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function realtimeFn($) {
  return () => {
    $.sectionStack.push("realtime");
    $.CONSUME(RealtimeToken); // "realtime"
    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.realtimeGetSessionFn) }, // "realtime.get_session"
      { ALT: () => $.SUBRULE($.realtimePublishFn) }, // "realtime.publish"
      { ALT: () => $.SUBRULE($.realtimeKickFn) }, // "realtime.kick"
    ]);
    $.sectionStack.pop();
  };
}
