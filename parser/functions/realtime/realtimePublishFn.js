import { PublishToken } from "../../../lexer/realtime.js";

// realtime.publish {
//   realtime_server = "main"
//   channel = "rooms/42"
//   message = "chat"          // optional — becomes the delivered frame's `type`
//   data = $payload
//   auth_table = "user"       // optional — asserted identity (attribution only)
//   auth_id = $auth.id        // optional
// }
//
// Injects a server-authored event onto a realtime v2 channel (the Xano backend
// mvp:realtime_publish). `realtime_server` + `channel` + `data` are required;
// `message`/`auth_table`/`auth_id` are optional. Flat attrs (the PHP transform
// maps auth_table/auth_id into the nested context.auth.{dbo_id,row_id} shape).
// Unlike realtime.get_session it has NO `as $var` binding.

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function realtimePublishFn($) {
  const requiredAttrs = ["realtime_server", "channel", "data"];
  const optionalAttrs = [
    "message",
    "auth_table",
    "auth_id",
    "description",
    "disabled",
  ];

  return () => {
    $.sectionStack.push("realtimePublishFn");
    const fnToken = $.CONSUME(PublishToken); // "publish"
    $.SUBRULE($.functionAttrReq, {
      ARGS: [fnToken, requiredAttrs, optionalAttrs],
    });
    $.sectionStack.pop();
  };
}
