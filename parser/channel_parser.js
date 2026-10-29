import {
  AccessToken,
  ConversationToken,
  DeliveryToken,
  PublishToken,
  RateLimitToken,
} from "../lexer/channel.js";
import { ChannelToken } from "../lexer/columns.js";
import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function channelDeclaration($) {
  return () => {
    let hasServer = false;
    let hasAccess = false;
    let hasPublish = false;
    let hasConversation = false;
    let hasDelivery = false;
    let hasRateLimit = false;
    let hasHistory = false;
    let hasMesh0 = false;
    let hasMiddleware = false;
    let hasInput = false;
    let hasDescription = false;
    let hasDocs = false;
    let hasGuid = false;
    let hasTags = false;
    let hasActive = false;

    $.sectionStack.push("channelDeclaration");
    // Allow leading comments and newlines before the channel declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(ChannelToken); // channel
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "channel");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasServer,
          ALT: () => {
            hasServer = true;
            $.SUBRULE($.realtimeServerClause);
          },
        },
        {
          GATE: () => !hasAccess,
          ALT: () => {
            hasAccess = true;
            const subParent = $.CONSUME(AccessToken); // "access"
            $.CONSUME2(EqualToken); // "="
            $.SUBRULE($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "anonymous?": "[boolean]",
                  "presence?": "[boolean]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasPublish,
          ALT: () => {
            hasPublish = true;
            const subParent = $.CONSUME(PublishToken); // "publish"
            $.CONSUME3(EqualToken); // "="
            $.SUBRULE1($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "who?": ["nobody", "anyone", "authenticated"],
                  "direct?": "[boolean]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasConversation,
          ALT: () => {
            hasConversation = true;
            const subParent = $.CONSUME(ConversationToken); // "conversation"
            $.CONSUME4(EqualToken); // "="
            $.SUBRULE2($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "active?": "[boolean]",
                  "limit?": "[number]",
                  "ttl?": "[number]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasDelivery,
          ALT: () => {
            hasDelivery = true;
            const subParent = $.CONSUME(DeliveryToken); // "delivery"
            $.CONSUME5(EqualToken); // "="
            $.SUBRULE3($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "guarantee?": ["at_most_once", "at_least_once"],
                  "per_recipient?": "[boolean]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasRateLimit,
          ALT: () => {
            hasRateLimit = true;
            const subParent = $.CONSUME(RateLimitToken); // "rate_limit"
            $.CONSUME6(EqualToken); // "="
            $.SUBRULE4($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "messages_per_minute?": "[number]",
                },
              ],
            });
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
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
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
          // written by the platform when the channel has docs
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
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
          GATE: () => !hasTags,
          ALT: () => {
            hasTags = true;
            $.SUBRULE($.tagsAttribute);
          },
        },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;
            $.SUBRULE($.activeFieldAttribute);
          },
        },
      ]);
    });

    if (!hasServer) {
      $.addMissingError(parent, "{} is missing a realtime_server clause");
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
