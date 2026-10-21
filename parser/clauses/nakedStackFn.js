import { ExclamationToken } from "../../lexer/cast.js";
import { CommentToken } from "../../lexer/comment.js";
import { LCurly, RCurly } from "../../lexer/control.js";
import { NewlineToken } from "../../lexer/tokens.js";
import { recordStatement } from "../functions/mcp/elicitLint.js";

export const DEFAULT_OPTIONS = {
  allowCallStatements: false,
};

/**
 * Similar to stackClause, but without the stack token
 * this is so it can be used in a group, conditional, loops...
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function nakedStackFn($) {
  return (options = {}) => {
    options = { ...DEFAULT_OPTIONS, ...options };

    $.sectionStack.push("nakedStackFn");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE1(() => $.CONSUME1(NewlineToken)); // required new line before each clause
      // $.OPTION(() => $.CONSUME(ExclamationToken)); // optional "!" to continue on error
      $.OR([
        { ALT: () => $.CONSUME(CommentToken) },
        {
          ALT: () => {
            $.OPTION(() => $.CONSUME(ExclamationToken)); // optional "!" to continue on error
            let startIdx;
            $.ACTION(() => {
              startIdx = $.exportLexerState() + 1;
            });
            $.OR1([
              { ALT: () => $.SUBRULE($.aiFn) },
              { ALT: () => $.SUBRULE($.dbFn) },
              { ALT: () => $.SUBRULE($.varFn) },
              { ALT: () => $.SUBRULE($.arrayFn) },
              { ALT: () => $.SUBRULE($.cloudFn) },
              { ALT: () => $.SUBRULE($.securityFn) },
              { ALT: () => $.SUBRULE($.mathFn) },
              { ALT: () => $.SUBRULE($.textFn) },
              { ALT: () => $.SUBRULE($.utilFn) },
              { ALT: () => $.SUBRULE($.realtimeFn) },
              { ALT: () => $.SUBRULE($.mcpFn) },
              { ALT: () => $.SUBRULE($.preconditionFn) },
              { ALT: () => $.SUBRULE($.zipFn) },
              { ALT: () => $.SUBRULE($.objectFn) },
              { ALT: () => $.SUBRULE($.apiFn, { ARGS: [options] }) },
              { ALT: () => $.SUBRULE($.webflowFn) },
              { ALT: () => $.SUBRULE($.redisFn) },
              { ALT: () => $.SUBRULE($.controlFn, { ARGS: [options] }) },
              { ALT: () => $.SUBRULE($.debugFn) },
              { ALT: () => $.SUBRULE($.datadogFn) },
              { ALT: () => $.SUBRULE($.storageFn) },
              { ALT: () => $.SUBRULE($.streamFn) },
              { ALT: () => $.SUBRULE($.actionCallFn) },
              {
                GATE: () => options.allowCallStatements,
                ALT: () => $.SUBRULE($.toolCallFn),
              },
              {
                GATE: () => options.allowCallStatements,
                ALT: () => $.SUBRULE($.addonCallFn),
              },
              {
                GATE: () => options.allowCallStatements,
                ALT: () => $.SUBRULE($.middlewareCallFn),
              },
              {
                GATE: () => options.allowCallStatements,
                ALT: () => $.SUBRULE($.triggerCallFn),
              },
              {
                GATE: () => options.allowCallStatements,
                ALT: () => $.SUBRULE($.workflowTestCallFn),
              },
              { ALT: () => $.SUBRULE($.workflowExpectFn) },
            ]);
            // write-before-elicit lint (see functions/mcp/elicitLint.js)
            $.ACTION(() => recordStatement($, startIdx));
          },
        },
      ]);
    });
    $.AT_LEAST_ONE2(() => $.CONSUME2(NewlineToken));
    $.CONSUME(RCurly); // "}"
    $.sectionStack.pop();
  };
}
