import { DatadogMetricBulkToken } from "../../../lexer/datadog.js";

/**
 * datadog.metric_bulk {
 *   entries = $entries
 * }
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function datadogMetricBulkFn($) {
  const requiredAttrs = ["entries"];
  const optionalAttrs = ["description", "disabled"];

  return () => {
    $.sectionStack.push("datadogMetricBulk");
    const tokenFn = $.CONSUME(DatadogMetricBulkToken); // metric_bulk
    $.SUBRULE($.functionAttrReq, {
      ARGS: [tokenFn, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
