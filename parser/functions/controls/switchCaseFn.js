import { ExclamationToken } from "../../../lexer/cast.js";
import {
  BreakToken,
  CaseToken,
  LParent,
  RParent,
} from "../../../lexer/control.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function switchCaseFn($) {
  return () => {
    $.sectionStack.push("switchCaseFn");
    $.SUBRULE($.optionalCommentBlockFn);
    // a disabled case is written `!case`, like a disabled statement
    $.OPTION2(() => $.CONSUME(ExclamationToken));
    $.CONSUME(CaseToken); // "case"
    $.CONSUME(LParent); // "("
    $.SUBRULE($.expressionFn);
    $.CONSUME(RParent); // ")"
    $.OPTION(() => $.SUBRULE($.nakedStackFn));
    $.OPTION1(() => $.CONSUME(BreakToken)); // "break"
    $.sectionStack.pop();
  };
}
