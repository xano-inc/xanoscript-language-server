import { realtimeGetSessionFn } from "./realtimeGetSessionFn.js";
import { realtimePublishFn } from "./realtimePublishFn.js";

/**
 * Registers all the parsers in this folder
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export const register = ($) => {
  $.realtimeGetSessionFn = $.RULE(
    "realtimeGetSessionFn",
    realtimeGetSessionFn($),
  );
  $.realtimePublishFn = $.RULE("realtimePublishFn", realtimePublishFn($));
};
