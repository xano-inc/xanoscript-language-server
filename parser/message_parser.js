import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { DeliverToToken, MessageToken } from "../lexer/message.js";
import { AuthToken, Identifier, NewlineToken } from "../lexer/tokens.js";

export function messageDeclaration($) {
  return () => {
    let hasAuth = false;
    let hasServer = false;
    let hasChannel = false;
    let hasDeliverTo = false;
    let hasDescription = false;
    let hasDocs = false;
    let hasActive = false;
    let hasGuid = false;
    let hasHistory = false;
    let hasInput = false;
    let hasMiddleware = false;
    let hasResponse = false;
    let hasStack = false;
    let hasTags = false;

    $.sectionStack.push("messageDeclaration");
    // Allow leading comments and newlines before the message declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(MessageToken);
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "message");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        { ALT: () => $.SUBRULE($.commentBlockFn) },
        {
          GATE: () => !hasAuth,
          ALT: () => {
            hasAuth = true;
            // message auth references an auth DBO by name, e.g. auth = "user"
            $.CONSUME(AuthToken); // "auth"
            $.CONSUME2(EqualToken); // "="
            $.CONSUME2(StringLiteral); // "user"
          },
        },
        {
          GATE: () => !hasServer,
          ALT: () => {
            hasServer = true;
            $.SUBRULE($.realtimeServerClause);
          },
        },
        {
          GATE: () => !hasChannel,
          ALT: () => {
            hasChannel = true;
            $.SUBRULE($.channelClause);
          },
        },
        {
          GATE: () => !hasDeliverTo,
          ALT: () => {
            hasDeliverTo = true;

            const subParent = $.CONSUME(DeliverToToken); // "deliver_to"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.schemaParseEnumFn, {
              ARGS: [
                subParent,
                ["channel", "sender", "others", "explicit"],
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
          // the backend emits `docs = "..."` for a
          // documented message; round-tripped on push.
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
          },
        },
        {
          // the backend emits `active = false` for a
          // disabled message; mirrors the sibling `channel` declaration.
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;
            $.SUBRULE($.activeFieldAttribute);
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
          GATE: () => !hasHistory,
          ALT: () => {
            hasHistory = true;
            $.SUBRULE($.historyClause);
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
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
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
      ]);
    });

    if (!hasServer) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing a realtime_server clause`,
      );
    }

    if (!hasChannel) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing a channel clause`,
      );
    }

    // input/stack/response are OPTIONAL on a message: a realtime v2 message is
    // created config-only (its Stack is generated server-side after save), so a
    // scaffold carrying only realtime_server/channel/deliver_to/description/history
    // must be diagnostic-clean. Mirrors channel_parser.js (requires realtime_server
    // only). When present, these clauses are still fully parsed + validated by the
    // OR2 alternatives above.

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
