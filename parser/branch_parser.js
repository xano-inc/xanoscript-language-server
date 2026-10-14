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

    const middlewareSchema = {
      pre: [{ name: "[string]" }],
      post: [{ name: "[string]" }],
    };

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          color: "[string]",
          "description?": "[string]",
          middleware: {
            function: middlewareSchema,
            query: middlewareSchema,
            task: middlewareSchema,
            tool: middlewareSchema,
          },
          history: {
            function: [false, 10, 100, 1000, 10000, "all"],
            query: [false, 10, 100, 1000, 10000, "all"],
            task: [false, 10, 100, 1000, 10000, "all"],
            tool: [false, 10, 100, 1000, 10000, "all"],
            trigger: [false, 10, 100, 1000, 10000, "all"],
            middleware: [false, 10, 100, 1000, 10000, "all"],
          },
        },
      ],
    });

    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
