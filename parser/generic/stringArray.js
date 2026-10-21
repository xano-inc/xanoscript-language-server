import { CommaToken, LSquare, RSquare } from "../../lexer/control.js";
import {
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../../lexer/literal.js";
import { NewlineToken } from "../../lexer/tokens.js";

/**
 * ["active", "inactive"]
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export const stringArray = ($) => () => {
  let hasSeparator = true; // allow a trailing comma
  let token = $.CONSUME(LSquare); // "["
  $.MANY(() => $.CONSUME(NewlineToken)); // allow new lines after the opening bracket
  $.MANY1(() => {
    if (!hasSeparator) {
      $.addMissingError(
        token,
        "Missing comma or newline between string values in the array"
      );
    }
    // '...' is how the platform writes a value holding a double quote
    token = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(SingleQuotedStringLiteral) },
    ]);
    hasSeparator = false;
    $.OPTION(() => {
      $.CONSUME(CommaToken);
      hasSeparator = true;
    }); // ","
    $.MANY2(() => {
      $.CONSUME1(NewlineToken);
      hasSeparator = true;
    }); // "\n"
  });
  $.CONSUME(RSquare); // "]"
};
