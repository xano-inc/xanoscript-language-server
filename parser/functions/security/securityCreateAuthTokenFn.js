import { SingleQuotedStringLiteral,StringLiteral } from "../../../lexer/literal.js";
import { CreateAuthTokenToken } from "../../../lexer/security.js";
import { getVarName } from "../../generic/utils.js";

const stringTokens = new Set([StringLiteral.name, SingleQuotedStringLiteral.name]);

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function securityCreateAuthTokenFn($) {
  return () => {
    $.sectionStack.push("securityCreateAuthTokenFn");
    const fnToken = $.CONSUME(CreateAuthTokenToken); // "create_auth_token"

    const captured = {};
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          extras: "[expression]",
          table: "[expression]",
          expiration: "[expression]",
          id: "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
        captured,
      ],
    });

    $.ACTION(() => {
      if (!captured.table) return;
      const keyOffset = captured.table.key?.startOffset;
      if (keyOffset == null) return;
      const tokens = $.input;
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].startOffset === keyOffset) {
          const valueToken = tokens[i + 2];
          if (valueToken && stringTokens.has(valueToken.tokenType.name)) {
            $.addReference("table", getVarName(valueToken), valueToken);
          }
          break;
        }
      }
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
