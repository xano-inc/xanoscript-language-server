import { RequestToken } from "../../../lexer/api.js";
import { RCurly } from "../../../lexer/control.js";
import { StringLiteral } from "../../../lexer/literal.js";
import { CompleteToken, OauthToken, RevokeToken } from "../../../lexer/mcp.js";
import { DotToken, NewlineToken } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

// The values the Xano backend's mvp:mcp_oauth_complete accepts for `decision`.
const DECISIONS = ["approve", "deny"];

/**
 * `decision` takes any expression (usually `$input.decision`), but a plain
 * string literal is checked against the enum here so a typo is caught in the
 * editor rather than refused at run time.
 * @param {import('../../base_parser.js').XanoBaseParser} $
 * @param {import('chevrotain').IToken} identifier
 */
function decisionValue($, identifier) {
  const first = $.LA(1);
  const next = $.LA(2);
  if (
    first.tokenType === StringLiteral &&
    (next.tokenType === NewlineToken || next.tokenType === RCurly)
  ) {
    const value = getVarName(first);
    if (!DECISIONS.includes(value)) {
      $.addInvalidValueError(
        first,
        `Invalid value "${value}". Must be one of: ${DECISIONS.map(
          (v) => `"${v}"`
        ).join(", ")}`
      );
    }
  }
  $.SUBRULE5($.expressionFn, { ARGS: [identifier, {}] });
}

// The `mcp.oauth.*` login hand-off statements (the Xano backend
// mvp:mcp_oauth_{complete,request,revoke}, kind schemas
// statement/mcp.oauth.{complete,request,revoke}.yaml). Each takes an optional
// `as $var` binding.

/**
 * mcp.oauth.complete, mcp.oauth.request, mcp.oauth.revoke
 * (the leading "mcp." is consumed by mcpFn)
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpOauthFn($) {
  return () => {
    $.sectionStack.push("mcpOauthFn");
    $.CONSUME(OauthToken); // "oauth"
    $.CONSUME(DotToken); // "."
    $.OR([
      { ALT: () => $.SUBRULE($.mcpOauthCompleteFn) }, // "complete"
      { ALT: () => $.SUBRULE($.mcpOauthRequestFn) }, // "request"
      { ALT: () => $.SUBRULE($.mcpOauthRevokeFn) }, // "revoke"
    ]);
    $.sectionStack.pop();
  };
}

// mcp.oauth.complete {
//   request = $input.mcp_request     // required: the opaque request handle
//   decision = "approve"             // required: approve | deny
//   unsafe_user_id = $user.id        // optional: sign in a row without $auth
// } as $continue_url
/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpOauthCompleteFn($) {
  const requiredAttrs = ["request", "decision"];
  const optionalAttrs = ["unsafe_user_id", "description", "disabled", "mock"];

  return () => {
    $.sectionStack.push("mcpOauthCompleteFn");
    const fnToken = $.CONSUME(CompleteToken); // "complete"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [
        fnToken,
        requiredAttrs,
        optionalAttrs,
        { types: { decision: decisionValue } },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}

// mcp.oauth.request {
//   request = $input.mcp_request
// } as $sign_in
/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpOauthRequestFn($) {
  const requiredAttrs = ["request"];
  const optionalAttrs = ["description", "disabled", "mock"];

  return () => {
    $.sectionStack.push("mcpOauthRequestFn");
    const fnToken = $.CONSUME(RequestToken); // "request"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}

// mcp.oauth.revoke {
//   mcp_server = "example_server"
//   user_id = $input.user_id         // exactly ONE of user_id, grant_id or
//   grant_id = $input.grant_id       // all = true must be in effect; that is
//   all = true                       // checked at run time on the values
// } as $revoked
/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpOauthRevokeFn($) {
  const requiredAttrs = ["mcp_server"];
  const optionalAttrs = [
    "user_id",
    "grant_id",
    "all",
    "description",
    "disabled",
    "mock",
  ];

  return () => {
    $.sectionStack.push("mcpOauthRevokeFn");
    const fnToken = $.CONSUME(RevokeToken); // "revoke"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
