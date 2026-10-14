import { StringLiteral } from "../lexer/literal.js";
import { JobToken, RunToken, ServiceToken } from "../lexer/run.js";
import { DotToken, Identifier, NewlineToken } from "../lexer/tokens.js";

export function runDeclaration($) {
  return () => {
    $.sectionStack.push("runDeclaration");
    // Allow leading comments and newlines before the run declaration
    $.SUBRULE($.optionalCommentBlockFn);

    $.CONSUME(RunToken); // "run"
    $.CONSUME(DotToken); // "."

    $.OR([
      { ALT: () => $.SUBRULE($.runJobClause) },
      { ALT: () => $.SUBRULE($.runServiceClause) },
    ]);

    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional trailing newlines
    $.sectionStack.pop();
  };
}

export function runJobClause($) {
  return () => {
    const parent = $.CONSUME(JobToken); // "job"

    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "job");

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          main: {
            name: "[string]",
            "input?": { "[string]?": "[constant]" },
          },
          "env?": ["[string]"],
        },
      ],
    });
  };
}

export function runServiceClause($) {
  return () => {
    const parent = $.CONSUME(ServiceToken); // "service"

    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "service");

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "pre?": {
            name: "[string]",
            input: { "[string]?": "[constant]" },
          },
          "env?": ["[string]"],
        },
      ],
    });
  };
}
