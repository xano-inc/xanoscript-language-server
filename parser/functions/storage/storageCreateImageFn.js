import { CreateImageToken } from "../../../lexer/storage.js";

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function storageCreateImageFn($) {
  return () => {
    $.sectionStack.push("storageCreateImageFn");
    const fnToken = $.CONSUME(CreateImageToken); // "create_image"
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        fnToken,
        {
          value: "[expression]",
          access: ["public", "private"],
          // Optional, as on create_audio/create_video: the platform omits it
          // when unset.
          "filename?": "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
        },
      ],
    });
    $.SUBRULE($.asVariable, { ARGS: [fnToken] });
    $.sectionStack.pop();
  };
}
