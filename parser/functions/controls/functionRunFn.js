import { FunctionToken, RunToken } from "../../../lexer/function.js";
import {
  FloatLiteral,
  IntegerLiteral,
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../../../lexer/literal.js";
import { DotToken, FalseToken, Identifier, TrueToken } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";

const literalTypeMap = new Map([
  [IntegerLiteral.name, "int"],
  [FloatLiteral.name, "decimal"],
  [StringLiteral.name, "text"],
  [SingleQuotedStringLiteral.name, "text"],
  [TrueToken.name, "bool"],
  [FalseToken.name, "bool"],
]);

/**
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function functionRunFn($) {
  return () => {
    $.sectionStack.push("functionRunFn");
    $.CONSUME(FunctionToken); // "function"
    $.CONSUME(DotToken); // "."
    const fnToken = $.CONSUME(RunToken); // "run"

    const nameToken = $.OR([
      { ALT: () => $.CONSUME(Identifier) },
      { ALT: () => $.CONSUME1(StringLiteral) },
    ]);
    $.addReference("function", getVarName(nameToken), nameToken);

    const captured = {};
    $.OPTION(() => {
      $.SUBRULE($.schemaParseAttributeFn, {
        ARGS: [
          fnToken,
          {
            "input?": { "[string]?": "[expression]" },
            "description?": "[string]",
            "disabled?": "[boolean]",
            "runtime_mode?": ["async-shared", "async-dedicated"],
            "mock?": { "![string]": "[expression]" },
          },
          captured,
        ],
      });
    });

    $.ACTION(() => {
      if (captured.input) {
        const args = {};
        const tokens = $.input;
        for (const [k, v] of Object.entries(captured.input)) {
          if (k === "key" || k === "value") continue;
          const keyOffset = v?.key?.startOffset;

          // Find value token: scan from key token, skip colon, grab next token
          let type = null;
          let value = v?.value?.image ?? null;
          if (keyOffset != null) {
            for (let i = 0; i < tokens.length - 2; i++) {
              if (tokens[i].startOffset === keyOffset) {
                // tokens[i] = key, tokens[i+1] = colon, tokens[i+2] = value
                const valueToken = tokens[i + 2];
                if (valueToken) {
                  type = literalTypeMap.get(valueToken.tokenType.name) ?? null;
                  if (type && !value) value = valueToken.image;
                }
                break;
              }
            }
          }

          args[k] = {
            value,
            type,
            startOffset: v?.key?.startOffset ?? null,
            endOffset: v?.key?.endOffset ?? null,
          };
        }
        if (Object.keys(args).length > 0) {
          $.setReferenceArgs(args);
        }
      }
    });

    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
