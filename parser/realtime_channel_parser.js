import { StringLiteral } from "../lexer/literal.js";
import { RealtimeChannelToken } from "../lexer/realtime_trigger.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function realtimeChannelDeclaration($) {
  return () => {
    $.sectionStack.push("realtimeChannelDeclaration");
    // Allow leading comments and newlines before the realtime_channel declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(RealtimeChannelToken); // realtime_channel
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "realtime_channel");

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "description?": "[string]",
          "active?": "[boolean]",
          "public_messaging?": {
            "active?": "[boolean]",
            "auth?": "[boolean]",
          },
          "private_messaging?": {
            "active?": "[boolean]",
            "auth?": "[boolean]",
          },
          "settings?": {
            anonymous_clients: "[boolean]",
            nested_channels: "[boolean]",
            // The CLI pull emits `message_history: history ?? 0` (an arbitrary
            // integer), so
            // accept any numeric value rather than a fixed enum. Kept typed
            // ("[number]") so a non-numeric value still surfaces a diagnostic.
            message_history: "[number]",
            auth_channel: "[boolean]",
            presence: "[boolean]",
          },
        },
      ],
    });

    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
