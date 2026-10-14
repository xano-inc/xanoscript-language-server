import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { ActiveToken } from "../lexer/mcp_server.js";
import { RealtimeServerToken } from "../lexer/realtime_server_trigger.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function realtimeServerDeclaration($) {
  return () => {
    let hasActive = false;
    let hasCanonical = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasDocs = false;
    let hasHistory = false;
    let hasMiddleware = false;
    let hasTags = false;

    $.sectionStack.push("realtimeServerDeclaration");
    // Allow leading comments and newlines before the realtime_server declaration
    $.SUBRULE($.optionalCommentBlockFn);
    $.CONSUME(RealtimeServerToken); // realtime_server
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "realtime_server");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;

            $.CONSUME(ActiveToken); // "active"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.booleanValue); // true/false
          },
        },
        {
          GATE: () => !hasCanonical,
          ALT: () => {
            hasCanonical = true;
            $.SUBRULE($.canonicalClause);
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
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
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

    // All fields are optional — only the declaration name is required.

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
