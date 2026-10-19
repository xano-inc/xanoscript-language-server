import { ProgressToken } from "../../../lexer/mcp.js";

// mcp.progress {
//   progress = $i
//   total = 100          // optional
//   message = "Working"  // optional
// }
//
// Emits `notifications/progress` on the current MCP response stream
// (the Xano backend mvp:mcp_progress). A value that does not strictly increase is
// dropped at run time. NO `as $var` binding.

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpProgressFn($) {
  const requiredAttrs = ["progress"];
  const optionalAttrs = [
    "total",
    "message",
    "description",
    "disabled",
    "mock",
  ];

  return () => {
    $.sectionStack.push("mcpProgressFn");
    const fnToken = $.CONSUME(ProgressToken); // "progress"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
