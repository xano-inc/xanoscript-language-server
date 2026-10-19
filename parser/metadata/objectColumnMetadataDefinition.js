import { LCurly, RCurly } from "../../lexer/control.js";
import { NewlineToken } from "../../lexer/tokens.js";

/**
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function objectColumnMetadataDefinition($) {
  return () => {
    $.sectionStack.push("objectColumnMetadataDefinition");

    let hasSensitiveField = false;
    let hasVisibilityField = false;
    let hasDescriptionField = false;
    let hasSchemaClause = false;

    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // Require at least one new line after {
      $.OR([
        {
          GATE: () => !hasSensitiveField, // Only allow the sensitive attribute if it hasn't been used yet
          ALT: () => {
            $.SUBRULE($.sensitiveFieldAttribute);
            hasSensitiveField = true;
          },
        },
        {
          GATE: () => !hasDescriptionField, // Only allow the description attribute if it hasn't been used yet
          ALT: () => {
            $.SUBRULE($.descriptionFieldAttribute);
            hasDescriptionField = true;
          },
        },
        {
          GATE: () => !hasVisibilityField, // Only allow the visibility attribute if it hasn't been used yet
          ALT: () => {
            $.SUBRULE($.visibilityFieldAttribute);
            hasVisibilityField = true;
          },
        },
        {
          GATE: () => !hasSchemaClause, // Only allow the schema clause if it hasn't been used yet
          ALT: () => {
            $.SUBRULE($.schemaClause, { ARGS: [{ include_file: false }] });
            hasSchemaClause = true;
          },
        },
      ]);
    });
    $.AT_LEAST_ONE1(() => $.CONSUME1(NewlineToken)); // Require at least one new line after {
    $.CONSUME(RCurly); // "}"

    const inTable = $.sectionStack.includes("tableDeclaration");
    if (hasVisibilityField && !inTable) {
      $.addInvalidValueError(
        null,
        'The "visibility" attribute is only valid within a table schema definition.',
      );
    }

    $.sectionStack.pop();
  };
}
