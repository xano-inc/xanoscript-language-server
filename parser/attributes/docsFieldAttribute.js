import { EqualToken } from "../../lexer/control.js";
import {
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../../lexer/literal.js";
import { MultiLineStringToken } from "../../lexer/multiline.js";
import { DocsToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function docsFieldAttribute($) {
  return () => {
    $.sectionStack.push("docsFieldAttribute");
    $.CONSUME(DocsToken); // "docs"
    $.CONSUME(EqualToken); // "="
    $.OR([
      {
        ALT: () => $.CONSUME(StringLiteral), // e.g., "A docs of the field"
      },
      {
        // the platform writes a value holding a double quote as '...'
        ALT: () => $.CONSUME(SingleQuotedStringLiteral),
      },
      {
        ALT: () => $.CONSUME(MultiLineStringToken), // e.g., "fieldDocs"
      },
    ]);
    $.sectionStack.pop();
  };
}
