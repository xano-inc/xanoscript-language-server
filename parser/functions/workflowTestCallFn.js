import { CallToken } from "../../lexer/function.js";
import { StringLiteral } from "../../lexer/literal.js";
import { DotToken, Identifier } from "../../lexer/tokens.js";
import { WorkflowTestToken } from "../../lexer/workflow_test.js";

/**
 * workflow_test.call "other test" { datasource = "test" } as $result
 *
 * Runs another workflow test as a step. The platform resolves the target
 * only inside a workflow test.
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function workflowTestCallFn($) {
  return () => {
    $.sectionStack.push("workflowTestCallFn");

    $.CONSUME(WorkflowTestToken); // "workflow_test"
    $.CONSUME(DotToken); // "."
    const fnToken = $.CONSUME(CallToken); // "call"

    if (!$.sectionStack.includes("workflowTestDeclaration")) {
      $.addInvalidValueError(
        fnToken,
        "workflow_test.call can only be used within workflow_test contexts",
      );
    }

    $.OR([
      { ALT: () => $.CONSUME(StringLiteral) }, // "other test"
      { ALT: () => $.CONSUME(Identifier) }, // other_test
    ]);

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          "datasource?": "[string]",
          "description?": "[string]",
          "disabled?": "[boolean]",
          "mock?": { "![string]": "[expression]" },
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
