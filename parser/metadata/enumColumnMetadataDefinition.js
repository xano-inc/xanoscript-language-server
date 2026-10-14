/**
 *
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function enumColumnMetadataDefinition($) {
  return (parent, captured = {}) => {
    $.sectionStack.push("enumColumnMetadataDefinition");

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "description?": "[string]",
          values: ["[string]"],
          "sensitive?": "[boolean]",
          "visibility?": ["public", "private", "internal"],
        },
        captured,
      ],
    });

    // you can only provide a visibility attribute if you're in a table definition
    const inTable = $.sectionStack.includes("tableDeclaration");
    if (!inTable && "visibility" in captured) {
      $.addInvalidValueError(
        parent,
        'The "visibility" attribute is only valid within a table schema definition.',
      );
    }

    $.sectionStack.pop();
  };
}
