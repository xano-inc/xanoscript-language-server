import {
  ActiveToken,
  ApiGroupToken,
  CanonicalToken,
  CorsToken,
  SwaggerToken,
} from "../lexer/api_group.js";
import { CommentToken } from "../lexer/comment.js";
import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function apiGroupDeclaration($) {
  return () => {
    let hasActive = false;
    let hasCanonical = false;
    let hasCors = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasDocs = false;
    let hasHistory = false;
    let hasSwagger = false;
    let hasTags = false;
    let hasMiddleware = false;

    $.sectionStack.push("apiGroupDeclaration");
    // Allow leading comments and newlines before the api_group declaration
    $.SUBRULE($.optionalCommentBlockFn);
    $.CONSUME(ApiGroupToken); // api_group
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "api_group");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken));
      $.OR2([
        { ALT: () => $.CONSUME(CommentToken) },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;
            $.CONSUME(ActiveToken);
            $.CONSUME1(EqualToken); // "="
            $.SUBRULE($.booleanValue);
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
          GATE: () => !hasCanonical,
          ALT: () => {
            hasCanonical = true;
            $.CONSUME(CanonicalToken);
            $.CONSUME2(EqualToken); // "="
            $.CONSUME2(StringLiteral);
          },
        },
        {
          GATE: () => !hasCors,
          ALT: () => {
            hasCors = true;

            const subParent = $.CONSUME(CorsToken);
            $.CONSUME3(EqualToken); // "="
            $.SUBRULE($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "mode?": "[string]",
                  "origins?": ["[string]"],
                  "methods?": ["[string]"],
                  "headers?": ["[string]"],
                  "credentials?": "[boolean]",
                  "max_age?": "[number]",
                },
              ],
            });
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
          GATE: () => !hasSwagger,
          ALT: () => {
            hasSwagger = true;
            const subRule = $.CONSUME(SwaggerToken);
            $.CONSUME4(EqualToken); // "="
            $.SUBRULE2($.schemaParseObjectFn, {
              ARGS: [
                subRule,
                {
                  "active?": "[boolean]",
                  "token?": "[string]",
                },
              ],
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
      ]);
    });

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly);
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
