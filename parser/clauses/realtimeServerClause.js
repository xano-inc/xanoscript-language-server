import { EqualToken } from "../../lexer/control.js";
import { StringLiteral } from "../../lexer/literal.js";
import { RealtimeServerToken } from "../../lexer/realtime_server_trigger.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export const realtimeServerClause = ($) => () => {
  $.sectionStack.push("realtimeServerClause");

  const parent = $.CONSUME(RealtimeServerToken); // realtime_server
  $.CONSUME(EqualToken); // =

  const result = $.CONSUME(StringLiteral); // "realtime_server_name"

  // Don't allow empty values inside quotes
  if (result.image === `""`) {
    $.addMissingError(parent, "realtime_server cannot be empty");
  }

  $.sectionStack.pop();
};
