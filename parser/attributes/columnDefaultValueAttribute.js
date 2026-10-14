import { EqualToken, Minus } from "../../lexer/control.js";
import {
  FloatLiteral,
  IntegerLiteral,
  StringLiteral,
} from "../../lexer/literal.js";
import {
  FalseToken,
  Identifier,
  NowToken,
  NullToken,
  TrueToken,
} from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export function columnDefaultValueAttribute($) {
  return () => {
    $.sectionStack.push("columnDefaultValueAttribute");
    $.CONSUME(EqualToken); // "="
    $.OR([
      { ALT: () => $.CONSUME(StringLiteral) }, // e.g., "default value"
      {
        ALT: () => {
          $.OPTION(() => $.CONSUME(Minus));
          return $.OR1([
            { ALT: () => $.CONSUME(IntegerLiteral) },
            { ALT: () => $.CONSUME(FloatLiteral) },
          ]);
        },
      },
      { ALT: () => $.CONSUME(TrueToken) }, // true
      { ALT: () => $.CONSUME(FalseToken) }, // false
      { ALT: () => $.CONSUME(NowToken) }, // now
      { ALT: () => $.CONSUME(NullToken) }, // null
      { ALT: () => $.CONSUME(Identifier) }, // when everything else fails, it's an identifier
    ]);
    $.sectionStack.pop();
  };
}
