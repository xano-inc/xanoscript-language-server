import { PipeToken } from "../../lexer/control.js";
import { DotToken, Identifier, NewlineToken } from "../../lexer/tokens.js";
import {
  ApiBaseUrlVariable,
  AuthVariable,
  BranchVariable,
  DatasourceVariable,
  EnvVariable,
  ErrorVariable,
  HttpHeadersVariable,
  InputVariable,
  LongFormVariable,
  RemoteHostVariable,
  RemoteIpVariable,
  RemotePasswordVariable,
  RemotePortVariable,
  RemoteUserVariable,
  RequestAuthTokenVariable,
  RequestMethod,
  RequestQuerystringVariable,
  RequestUriVariable,
  ShortFormVariable,
  TenantVariable,
  WebflowVariable,
} from "../../lexer/variables.js";

// Blacklisted variable names that conflict with built-in variables
// These names cannot be used for user-defined variables because they
// would conflict with their shorthand form (e.g., $var.input -> $input)
export const BLACKLISTED_VARIABLE_NAMES = [
  "auth",
  "input",
  "env",
  "response",
  "output",
  "var",
  "db",
  "error",
  "toolset",
  "this",
];

/**
 * Check if a variable name is blacklisted
 * @param {string} name - Variable name without $ prefix
 * @returns {boolean}
 */
export function isBlacklistedVariableName(name) {
  return BLACKLISTED_VARIABLE_NAMES.includes(name);
}

/**
 * represent $var.x or $x, the only format accepting an assigment
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function assignableVariableProperty($) {
  return () => {
    let variableName = "";
    let variableToken = null;
    $.OR({
      DEF: [
        // "$users" or env property tokens like "$http_headers"
        // TODO: probably a good idea to add a warning when an reserved env property
        // token is used as a variable name
        {
          ALT: () => {
            const variable = $.OR1([
              { ALT: () => $.CONSUME(ShortFormVariable) },
              { ALT: () => $.CONSUME(ApiBaseUrlVariable) },
              { ALT: () => $.CONSUME(BranchVariable) },
              { ALT: () => $.CONSUME(DatasourceVariable) },
              { ALT: () => $.CONSUME(HttpHeadersVariable) },
              { ALT: () => $.CONSUME(RemoteHostVariable) },
              { ALT: () => $.CONSUME(RemoteIpVariable) },
              { ALT: () => $.CONSUME(RemotePasswordVariable) },
              { ALT: () => $.CONSUME(RemotePortVariable) },
              { ALT: () => $.CONSUME(RemoteUserVariable) },
              { ALT: () => $.CONSUME(RequestAuthTokenVariable) },
              { ALT: () => $.CONSUME(RequestMethod) },
              { ALT: () => $.CONSUME(RequestQuerystringVariable) },
              { ALT: () => $.CONSUME(RequestUriVariable) },
              { ALT: () => $.CONSUME(TenantVariable) },
              { ALT: () => $.CONSUME(WebflowVariable) },
              // Not recommended but still valid
              { ALT: () => $.CONSUME(EnvVariable) },
              { ALT: () => $.CONSUME(AuthVariable) },
              { ALT: () => $.CONSUME(InputVariable) },
              { ALT: () => $.CONSUME(ErrorVariable) },
            ]);
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

            // because we want to allow "$var" we need to optionally consume a dot and an identifier
            $.OPTION(() => {
              $.CONSUME(DotToken);
              const variable = $.CONSUME(Identifier);
              variableName = `$${variable.image}`;
              variableToken = variable;
            });
          },
        },
      ],
      ERR_MSG: "expecting variable (e.g. $variable or $var.variable)",
    });

    // Check for blacklisted variable names
    if (variableName && variableToken) {
      // Extract the name without $ prefix for checking
      const nameWithoutPrefix = variableName.startsWith("$")
        ? variableName.slice(1)
        : variableName;
      if (isBlacklistedVariableName(nameWithoutPrefix)) {
        $.addWarning(
          `'${variableName}' is a reserved variable name and should not be used`,
          variableToken,
        );
      }
    }

    $.SUBRULE($.chainedIdentifier);

    $.MANY({
      // This is a tricky one, we allow a new line breaking an expression but only
      // if the following line is a filter (starts with a pipe)
      // We use LookAhead to peek at the next tokens without consuming them
      // to decide if we should close or keep the gate open
      GATE: () =>
        $.LA(1).tokenType === PipeToken ||
        ($.LA(1).tokenType === NewlineToken && $.LA(2).tokenType === PipeToken),
      DEF: () => {
        $.SUBRULE($.filterFn);
      },
    });

    // Only register as a declaration when used in an "as $var" context.
    // Other callers (var.update, math.*, text.*) are usages, not declarations,
    // and the token scanner will pick them up automatically.
    if (variableName && $.__assignableIsDeclaration) {
      $.addVariable(variableName, "unknown", variableToken);
    }
  };
}
