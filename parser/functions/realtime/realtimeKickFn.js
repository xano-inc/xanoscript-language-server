import { KickToken } from "../../../lexer/realtime.js";

// realtime.kick {
//   realtime_server = "main"
//   channel = "rooms/42"
//   auth_table = "user"       // the identity to remove
//   auth_id = $input.user_id
//   reason = "removed"        // optional — sent to the removed connections
// }
//
// Takes one identity's sockets out of one realtime v2 channel
// (mvp:realtime_kick). A channel's join
// gate runs once, so this is the step that removes a member whose access was
// revoked. Each of their sockets leaves the channel and is told it was kicked;
// it stays connected to its other channels.
// The identity is required (a kick names who to remove), so auth_table and
// auth_id are required here, though the kind schema lists them optional the way
// realtime.publish does. Like realtime.publish it has NO `as $var` binding.

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function realtimeKickFn($) {
  const requiredAttrs = ["realtime_server", "channel", "auth_table", "auth_id"];
  const optionalAttrs = ["reason", "description", "disabled"];

  return () => {
    $.sectionStack.push("realtimeKickFn");
    const fnToken = $.CONSUME(KickToken); // "kick"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
