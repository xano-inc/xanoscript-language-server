import { DotToken, Identifier } from "../../lexer/tokens.js";
import {
  AuthVariable,
  EnvVariable,
  ErrorVariable,
  InputVariable,
  LongFormVariable,
  ShortFormVariable,
} from "../../lexer/variables.js";
import { isBlacklistedVariableName } from "./assignableVariableProperty.js";

/**
 * represent $var.x or $x, the only format accepting an assigment
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function assignableVariableAs($) {
  return () => {
    let variableName = "";
    let variableToken = null;
    $.OR([
      // "$users"
      {
        ALT: () => {
          const variable = $.CONSUME(ShortFormVariable);
          variableName = variable.image;
          variableToken = variable;
        },
      },
      // "$var.users"
      {
        ALT: () => {
          const variable = $.CONSUME(LongFormVariable);
          variableName = variable.image;
          variableToken = variable;

          // Handle optional property access, e.g., "$var.users" because "$var" is a valid
          // variable name even if it's not recommended and confusing
          $.OPTION(() => {
            $.CONSUME(DotToken);
            const variable = $.CONSUME(Identifier);
            variableName = `$${variable.image}`;
            variableToken = variable;
          });
        },
      },
      {
        ALT: () => {
          const variable = $.CONSUME(EnvVariable);
          variableName = variable.image;
          variableToken = variable;
        },
      },
      {
        ALT: () => {
          const variable = $.CONSUME(AuthVariable);
          variableName = variable.image;
          variableToken = variable;
        },
      },
      {
        ALT: () => {
          const variable = $.CONSUME(InputVariable);
          variableName = variable.image;
          variableToken = variable;
        },
      },
      {
        ALT: () => {
          const variable = $.CONSUME(ErrorVariable);
          variableName = variable.image;
          variableToken = variable;
        },
      },
    ]);

    // Check for blacklisted variable names
    if (variableName && variableToken) {
      const nameWithoutPrefix = variableName.startsWith("$")
        ? variableName.slice(1)
        : variableName;
      if (isBlacklistedVariableName(nameWithoutPrefix)) {
        $.addWarning(
          `'${variableToken.image}' is a reserved variable name and should not be used as a variable.`,
          variableToken,
        );
      }
      $.addVariable(variableName, "unknown", variableToken);
    }
  };
}
