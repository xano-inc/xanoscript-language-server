import { ChannelTriggerToken } from "../lexer/channel_trigger.js";
import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import { ActionsToken, ActiveToken } from "../lexer/mcp_server_trigger.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function channelTriggerDeclaration($) {
  return () => {
    let hasActions = false;
    let hasActive = false;
    let hasServer = false;
    let hasChannel = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasHistory = false;
    let hasMesh0 = false;
    let hasInput = false;
    let hasResponse = false;
    let hasStack = false;
    let hasTags = false;

    $.sectionStack.push("channelTriggerDeclaration");
    // Allow leading comments and newlines before the channel_trigger declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(ChannelTriggerToken); // channel_trigger
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "channel_trigger");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasActions,
          ALT: () => {
            hasActions = true;

            const subParent = $.CONSUME(ActionsToken); // "actions"
            $.CONSUME(EqualToken); // "="

            $.SUBRULE($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "join?": "[boolean]",
                  "leave?": "[boolean]",
                  "deliver?": "[boolean]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;
            $.CONSUME(ActiveToken);
            $.CONSUME2(EqualToken);
            $.SUBRULE($.booleanValue);
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
          GATE: () => !hasInput,
          ALT: () => {
            hasInput = true;
            $.SUBRULE($.inputClause);
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
            $.SUBRULE($.stackClause);
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
      $.addMissingError(parent, "{} is missing a realtime_server clause");
    }

    if (!hasChannel) {
      $.addMissingError(parent, "{} is missing a channel clause");
    }

    if (!hasInput) {
      $.addMissingError(parent, "{} is missing an input clause");
    }

    if (!hasStack) {
      $.addMissingError(parent, "{} is missing a stack clause");
    }

    if (!hasResponse) {
      $.addMissingError(parent, "{} is missing a response clause");
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
