import { ArrayToken, ShiftToken } from "../../../lexer/arrays.js";
import { AsToken } from "../../../lexer/control.js";
import { DotToken } from "../../../lexer/tokens.js";

/**
 * array.shift $my_array as $test
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function arrayShiftFn($) {
  return () => {
    $.sectionStack.push("arrayShiftFn");
    $.OPTION(() => {
      $.CONSUME(ArrayToken); // "array"
      $.CONSUME(DotToken); // "."
    });
    $.CONSUME(ShiftToken); // "shift"
    $.SUBRULE($.variableOnly);
    $.OPTION1(() => {
      $.CONSUME(AsToken);
      $.SUBRULE($.assignableVariableAs);
    });
    $.sectionStack.pop();
  };
}
