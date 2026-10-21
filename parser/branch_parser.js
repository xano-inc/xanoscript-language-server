import { BranchToken } from "../lexer/branch.js";
import { StringLiteral } from "../lexer/literal.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function branchDeclaration($) {
  return () => {
    $.sectionStack.push("branchDeclaration");
    // Allow leading comments and newlines before the branch declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(BranchToken); // branch
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "branch");

    // Mirrors the branch document the platform writes on pull. A middleware
    // entry carries `active: false` when the middleware is disabled.
    const middlewareEntry = { name: "[string]", "active?": "[boolean]" };
    const middlewareSchema = {
      pre: [middlewareEntry],
      post: [middlewareEntry],
    };

    // `0` is a valid limit, and the backend writes `task: 0` (not `false`)
    // for a disabled task history.
    const historyValues = [false, 0, 10, 100, 1000, 10000, "all"];

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "description?": "[string]",
          // Omitted by the backend when the branch has no color.
          "color?": "[string]",
          middleware: {
            function: middlewareSchema,
            query: middlewareSchema,
            task: middlewareSchema,
            tool: middlewareSchema,
            // Always written by the platform.
            "message?": middlewareSchema,
            // Written only when the branch has some.
            "prompt?": middlewareSchema,
            "resource?": middlewareSchema,
          },
          history: {
            function: historyValues,
            query: historyValues,
            task: historyValues,
            tool: historyValues,
            trigger: historyValues,
            middleware: historyValues,
            // Written only when they differ from the default.
            "prompt?": historyValues,
            "resource?": historyValues,
          },
        },
      ],
    });

    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
