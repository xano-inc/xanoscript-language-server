import { DatadogLogBulkToken } from "../../../lexer/datadog.js";

/**
 * datadog.log_bulk {
 *   entries = $entries
 * }
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function datadogLogBulkFn($) {
  const requiredAttrs = ["entries"];
  const optionalAttrs = ["description", "disabled"];

  return () => {
    $.sectionStack.push("datadogLogBulk");
    const tokenFn = $.CONSUME(DatadogLogBulkToken); // log_bulk
    $.SUBRULE($.functionAttrReq, {
      ARGS: [tokenFn, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
