import { LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";
import { InstructionsToken, ToolToken } from "../lexer/tool.js";

export function toolDeclaration($) {
  return () => {
    let hasAnnotations = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasDocs = false;
    let hasHistory = false;
    let hasMesh0 = false;
    let hasIcons = false;
    let hasInput = false;
    let hasInstructions = false;
    let hasMiddleware = false;
    let hasOutput = false;
    let hasResponse = false;
    let hasStack = false;
    let hasTags = false;
    let hasTitle = false;

    $.sectionStack.push("toolDeclaration");
    // Allow leading comments and newlines before the tool declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(ToolToken);
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "tool");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        { ALT: () => $.SUBRULE($.commentBlockFn) },
        {
          GATE: () => !hasAnnotations,
          ALT: () => {
            hasAnnotations = true;
            $.SUBRULE($.mcpToolAnnotationsClause);
          },
        },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasGuid,
          ALT: () => {
            hasGuid = true;
            $.SUBRULE($.guidFieldAttribute);
          },
        },
        {
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
          },
        },
        {
          GATE: () => !hasHistory,
          ALT: () => {
            hasHistory = true;
            $.SUBRULE($.historyClause);
          },
        },
        {
          GATE: () => !hasMesh0,
          ALT: () => {
            hasMesh0 = true;
            $.SUBRULE($.mesh0Clause);
          },
        },
        {
          GATE: () => !hasIcons,
          ALT: () => {
            hasIcons = true;
            $.SUBRULE($.mcpIconsClause);
          },
        },
        {
          GATE: () => !hasInput,
          ALT: () => {
            hasInput = true;
            $.SUBRULE($.inputClause);
          },
        },
        {
          GATE: () => !hasInstructions,
          ALT: () => {
            hasInstructions = true;

            // instructions = {string or multiline string}
            $.SUBRULE($.flexibleStringClause, {
              ARGS: [InstructionsToken],
            });
          },
        },
        {
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
          },
        },
        {
          GATE: () => !hasOutput,
          ALT: () => {
            hasOutput = true;
            $.SUBRULE($.outputClause);
          },
        },
        {
          GATE: () => !hasResponse,
          ALT: () => {
            hasResponse = true;
            $.SUBRULE($.responseClause);
          },
        },
        {
          GATE: () => !hasStack,
          ALT: () => {
            hasStack = true;
            $.SUBRULE($.stackClause, {
              ARGS: [{ allowCallStatements: true }],
            });
          },
        },
        {
          GATE: () => !hasTags,
          ALT: () => {
            hasTags = true;
            $.SUBRULE($.tagsAttribute);
          },
        },
        {
          GATE: () => !hasTitle,
          ALT: () => {
            hasTitle = true;
            $.SUBRULE($.mcpTitleClause);
          },
        },
      ]);
    });

    if (!hasInput) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing an input clause`,
      );
    }

    if (!hasStack) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing a stack clause`,
      );
    }

    if (!hasResponse) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing a response clause`,
      );
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
