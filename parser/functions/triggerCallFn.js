import { CallToken } from "../../lexer/function.js";
import { StringLiteral } from "../../lexer/literal.js";
import { Identifier } from "../../lexer/tokens.js";
import { DotToken, TriggerToken } from "../../lexer/tokens.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function triggerCallFn($) {
  return () => {
    $.sectionStack.push("triggerCallFn");

    $.CONSUME(TriggerToken); // "trigger"
    $.CONSUME(DotToken); // "."
    const fnToken = $.CONSUME(CallToken); // "call"

    // Validate that trigger.call is only used in allowed contexts
    const validContexts = ["workflowTestDeclaration"];
    const isInValidContext = validContexts.some((context) =>
      $.sectionStack.includes(context),
    );

    if (!isInValidContext) {
      $.addInvalidValueError(
        fnToken,
        "trigger.call can only be used within workflow_test contexts",
      );
    }

    $.OR([
      { ALT: () => $.CONSUME(StringLiteral) }, // "foo/bar"
      { ALT: () => $.CONSUME(Identifier) }, // foo
    ]);

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          "description?": "[string]",
          "disabled?": "[boolean]",
          "input?": { "[string]": "[expression]" },
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
