import { DatadogMetricToken } from "../../../lexer/datadog.js";

/**
 * datadog.metric {
 *   metric = "requests.count"
 *   value  = 1
 *   type   = "count"
 *   tags   = '{"env":"prod"}'|json_decode
 * }
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function datadogMetricFn($) {
  const requiredAttrs = ["metric", "value"];
  const optionalAttrs = [
    "type",
    "tags",
    "service",
    "source",
    "env",
    "hostname",
    "ddtags",
    "timestamp",
    "connection",
    "description",
    "disabled",
  ];

  return () => {
    $.sectionStack.push("datadogMetric");
    const tokenFn = $.CONSUME(DatadogMetricToken); // metric
    $.SUBRULE($.functionAttrReq, {
      ARGS: [tokenFn, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
