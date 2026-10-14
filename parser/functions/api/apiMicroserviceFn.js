import { MicroserviceToken } from "../../../lexer/api.js";

// api.microservice {
//   host = $host
//   path = "/reload"
//   method = "POST"
//   params = {}
//   headers = []
//   timeout = 60
//   follow_location = true
// } as $api_1

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function apiMicroserviceFn($) {
  return () => {
    $.sectionStack.push("apiMicroserviceFn");
    const fnToken = $.CONSUME(MicroserviceToken); // "microservice"
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          host: "[expression]",
          path: "[expression]",
          method: "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
          "params?": "[expression]",
          "headers?": "[expression]",
          "timeout?": "[expression]",
          "follow_location?": "[expression]",
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
