import { DotToken } from "../../lexer/tokens.js";
import { UpdateToken, VarToken } from "../../lexer/var.js";
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
import { isBlacklistedVariableName } from "../generic/assignableVariableProperty.js";

/**
 * represent $var.x or $x, the only format accepting an assigment
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function varFn($) {
  return () => {
    $.sectionStack.push("var");

    const nameToken = $.CONSUME(VarToken); // "var"
    $.OR([
      {
        // "var $users"
        ALT: () => {
          // "$users" or env property tokens like "$http_headers"
          // TODO: probably a good idea to add a warning when an reserved env property
          // token is used as a variable name
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
            { ALT: () => $.CONSUME(LongFormVariable) },
            { ALT: () => $.CONSUME(EnvVariable) },
            { ALT: () => $.CONSUME(AuthVariable) },
            { ALT: () => $.CONSUME(InputVariable) },
            { ALT: () => $.CONSUME(ErrorVariable) },
          ]);

          if (variable.image) {
            // Check for blacklisted variable names
            const nameWithoutPrefix = variable.image.startsWith("$")
              ? variable.image.slice(1)
              : variable.image;
            if (isBlacklistedVariableName(nameWithoutPrefix)) {
              $.addWarning(
                `'${variable.image}' is a reserved variable name and should not be used as a variable.`,
                variable,
              );
            }
            // we can directly add the variable here but
            // not necessary for the `assignableVariableProperty` below
            // which will add it on its own
            $.addVariable(variable.image, "unknown", variable);
          }
        },
      },
      {
        // "var.update $users"
        ALT: () => {
          $.CONSUME(DotToken);
          $.CONSUME(UpdateToken);
          $.SUBRULE($.assignableVariableProperty);
        },
      },
    ]);

    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        nameToken,
        {
          value: "[expression]",
          "description?": "[string]",
          "disabled?": "[boolean]",
          "mock?": { "![string]": "[expression]" },
        },
      ],
    });

    $.sectionStack.pop();
  };
}
