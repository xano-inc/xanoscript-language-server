import { ApiToken } from "../../lexer/api.js";
import { DotToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function apiFn($) {
  return () => {
    $.sectionStack.push("api");
    $.CONSUME(ApiToken); // "api"
    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.apiCallFn) }, // "api.call"
      { ALT: () => $.SUBRULE($.apiLambdaFn) }, // "api.lambda"
      { ALT: () => $.SUBRULE($.apiRequestFn) }, // "api.request"
      { ALT: () => $.SUBRULE($.apiRealtimeEventFn) }, // "api.realtime_event"
      { ALT: () => $.SUBRULE($.apiStreamFn) }, // "api.stream"
      { ALT: () => $.SUBRULE($.apiMicroserviceFn) }, // "api.microservice"
    ]);
    $.sectionStack.pop();
  };
}
