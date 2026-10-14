import { McpToken } from "../../lexer/ai.js";
import { DotToken } from "../../lexer/tokens.js";

/**
 * mcp.elicit, mcp.progress, mcp.oauth.{complete,request,revoke}
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mcpFn($) {
  return () => {
    $.sectionStack.push("mcp");
    $.CONSUME(McpToken); // "mcp"
    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.mcpElicitFn) }, // "mcp.elicit"
      { ALT: () => $.SUBRULE($.mcpProgressFn) }, // "mcp.progress"
      { ALT: () => $.SUBRULE($.mcpOauthFn) }, // "mcp.oauth.*"
    ]);
    $.sectionStack.pop();
  };
}
