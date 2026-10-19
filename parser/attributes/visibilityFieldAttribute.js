import { EqualToken } from "../../lexer/control.js";
import { VisibilityToken } from "../../lexer/table.js";

/**
 * Visibility Field Attribute Parser on table metadata definitions
 * @param {import('../base_parser.js').XanoBaseParser} $
 * @returns
 */
export const visibilityFieldAttribute = ($) => () => {
  $.sectionStack.push("visibilityFieldAttribute");
  const parent = $.CONSUME(VisibilityToken); // "visibility"
  $.CONSUME(EqualToken); // "="
  $.SUBRULE($.schemaParseEnumFn, {
    ARGS: [parent, ["private", "internal", "public"]],
  });
  $.sectionStack.pop();
};
