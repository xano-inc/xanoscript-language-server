import { CallToken } from "../../../lexer/api.js";
import { EqualToken } from "../../../lexer/control.js";
import { StringLiteral } from "../../../lexer/literal.js";
import {
  DELETEToken,
  GETToken,
  PATCHToken,
  POSTToken,
  PUTToken,
  VerbToken,
} from "../../../lexer/query.js";
import { Identifier } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function apiCallFn($) {
  return () => {
    $.sectionStack.push("apiCallFn");
    const fnToken = $.CONSUME(CallToken); // "call"

    // Validate that api.call is only used in allowed contexts
    const validContexts = [
      "workflowTestDeclaration",
      "toolDeclaration",
      "testClause",
    ];
    const isInValidContext = validContexts.some((context) =>
      $.sectionStack.includes(context),
    );

    if (!isInValidContext) {
      $.addInvalidValueError(
        fnToken,
        "api.call can only be used within workflow_test, tool, or test contexts",
      );
    }

    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.addReference("query", getVarName(nameToken), nameToken);
    $.CONSUME(VerbToken);
    $.CONSUME(EqualToken);
    $.OR1([
      { ALT: () => $.CONSUME(DELETEToken) },
      { ALT: () => $.CONSUME(GETToken) },
      { ALT: () => $.CONSUME(PATCHToken) },
      { ALT: () => $.CONSUME(POSTToken) },
      { ALT: () => $.CONSUME(PUTToken) },
    ]);
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          api_group: "[string]",
          // The endpoint's credential, as the server's transform reads it:
          // a literal token (the parser refuses a computed one; use an
          // Authorization header for that), and ignore_expiration.
          "auth?": { token: "[string]", "ignore_expiration?": "[boolean]" },
          "description?": "[string]",
          "disabled?": "[boolean]",
          "headers?": "[expression]",
          "input?": { "[string]": "[expression]" },
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
