import { datadogLogBulkFn } from "./datadogLogBulkFn.js";
import { datadogLogFn } from "./datadogLogFn.js";
import { datadogMetricBulkFn } from "./datadogMetricBulkFn.js";
import { datadogMetricFn } from "./datadogMetricFn.js";

/**
 * Registers all the parsers in this folder
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export const register = ($) => {
  $.datadogLogFn = $.RULE("datadogLogFn", datadogLogFn($));
  $.datadogLogBulkFn = $.RULE("datadogLogBulkFn", datadogLogBulkFn($));
  $.datadogMetricFn = $.RULE("datadogMetricFn", datadogMetricFn($));
  $.datadogMetricBulkFn = $.RULE(
    "datadogMetricBulkFn",
    datadogMetricBulkFn($)
  );
};
