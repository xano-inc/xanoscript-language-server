import { DatadogLogToken } from "../../../lexer/datadog.js";

/**
 * datadog.log {
 *   message    = "hi"
 *   status     = "info"
 *   attributes = '{"A":"B"}'|json_decode
 * }
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function datadogLogFn($) {
  const requiredAttrs = ["message"];
  const optionalAttrs = [
    "status",
    "attributes",
    "service",
    "source",
    "env",
    "hostname",
    "ddtags",
    "tags",
    "timestamp",
    "connection",
    "description",
    "disabled",
  ];

  return () => {
    $.sectionStack.push("datadogLog");
    const tokenFn = $.CONSUME(DatadogLogToken); // log
    $.SUBRULE($.functionAttrReq, {
      ARGS: [tokenFn, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
