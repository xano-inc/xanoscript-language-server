import { DatadogToken } from "../../lexer/datadog.js";
import { DotToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function datadogFn($) {
  return () => {
    $.sectionStack.push("datadog");
    $.CONSUME(DatadogToken); // "datadog"
    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.datadogLogBulkFn) }, // datadog.log_bulk
      { ALT: () => $.SUBRULE($.datadogLogFn) }, // datadog.log
      { ALT: () => $.SUBRULE($.datadogMetricBulkFn) }, // datadog.metric_bulk
      { ALT: () => $.SUBRULE($.datadogMetricFn) }, // datadog.metric
    ]);
    $.sectionStack.pop();
  };
}
