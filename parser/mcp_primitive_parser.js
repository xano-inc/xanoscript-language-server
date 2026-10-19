import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import {
  MimeTypeToken,
  PromptToken,
  ResourceToken,
  UriToken,
} from "../lexer/mcp.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";
import { getVarName } from "./generic/utils.js";

// First-class MCP `prompt` and `resource` workspace objects (MCP 2026-07-28),
// attached to an `mcp_server` through its `prompts` / `resources` blocks.
// Grounded against the Xano backend's `script/kind/schema/core/{prompt,resource}.yaml`.
//
//   prompt code_review {                 resource regional_order {
//     title = "Code review"                uri = "orders://{region}/{order_id}"
//     icons = [...]                        mime_type = "application/json"
//     input { text code }                  annotations = {audience: ["user"]}
//     stack { ... }                        input { enum region {...} int order_id }
//     response = $messages                 stack { ... }
//   }                                      response = $order
//                                        }

/** The input field types a resource uri variable can be bound to (redacted). */
export const RESOURCE_URI_VARIABLE_TYPES = [
  "text",
  "int",
  "decimal",
  "bool",
  "enum",
  "email",
  "uuid",
];

const URI_OPERATORS = "+#./;?&=,!@|";
const MIME_TYPE =
  /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*(\s*;.*)?$/;

/**
 * Parse a resource uri: a literal URI, or an RFC 6570 LEVEL-1 template.
 * Mirrors the Xano backend's `redacted`.
 * @param {string} uri
 * @returns {{ problem: string|null, variables: string[] }}
 */
export function parseResourceUri(uri) {
  const fail = (problem) => ({ problem, variables: [] });

  if (uri === "") return fail("a resource needs a uri");
  if (/\s/.test(uri)) return fail(`resource uri "${uri}" must not contain whitespace`);
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(uri)) {
    return fail(`resource uri "${uri}" must start with a scheme, e.g. docs://readme`);
  }

  const variables = [];
  let i = 0;
  let lastEnd = -1;
  while (i < uri.length) {
    const ch = uri[i];
    if (ch === "}") return fail(`resource uri "${uri}" has a "}" with no matching "{"`);
    if (ch !== "{") {
      i++;
      continue;
    }
    const close = uri.indexOf("}", i + 1);
    const nextOpen = uri.indexOf("{", i + 1);
    if (close === -1 || (nextOpen !== -1 && nextOpen < close)) {
      return fail(`resource uri "${uri}" has an unclosed "{"`);
    }
    const expression = uri.slice(i + 1, close);
    if (expression === "") return fail(`resource uri "${uri}" has an empty "{}"`);
    if (URI_OPERATORS.includes(expression[0])) {
      return fail(
        `resource uri template "{${expression}}" uses an operator; only level-1 {name} variables are supported`,
      );
    }
    if (expression.includes(",")) {
      return fail(
        `resource uri template "{${expression}}" lists several variables; use one {name} per variable`,
      );
    }
    if (expression.includes("*") || expression.includes(":")) {
      return fail(
        `resource uri template "{${expression}}" uses a modifier; only level-1 {name} variables are supported`,
      );
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) {
      return fail(`resource uri variable "${expression}" must be letters, digits and _`);
    }
    if (variables.includes(expression)) {
      return fail(`resource uri variable "${expression}" appears more than once`);
    }
    if (lastEnd === i - 1) {
      return fail(`resource uri "${uri}" has two adjacent variables, which cannot be told apart`);
    }
    variables.push(expression);
    lastEnd = close;
    i = close + 1;
  }

  return { problem: null, variables };
}

/**
 * Why a resource's uri variables and its input block disagree, or null.
 * Mirrors the Xano backend's `redacted`.
 * @param {string[]} variables
 * @param {Object<string, {type: string, iterable: boolean}>} inputs
 * @returns {string|null}
 */
export function resourceInputProblem(variables, inputs) {
  for (const variable of variables) {
    const field = inputs[variable];
    if (!field) {
      return `resource uri variable "${variable}" must be declared in the input block`;
    }
    if (!RESOURCE_URI_VARIABLE_TYPES.includes(field.type)) {
      return `resource uri variable "${variable}" must be one of ${RESOURCE_URI_VARIABLE_TYPES.join(", ")} — got "${field.type}"`;
    }
    if (field.iterable) {
      return `resource uri variable "${variable}" must be a single value, not a list`;
    }
  }

  for (const name of Object.keys(inputs)) {
    if (!variables.includes(name)) {
      return variables.length === 0
        ? `input "${name}" cannot be set: a static resource has no inputs (use a {${name}} uri template)`
        : `input "${name}" is not a variable of the resource uri`;
    }
  }

  return null;
}

/**
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function promptDeclaration($) {
  return mcpPrimitiveDeclaration($, "prompt");
}

/**
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function resourceDeclaration($) {
  return mcpPrimitiveDeclaration($, "resource");
}

/**
 * @param {import('./base_parser.js').XanoBaseParser} $
 * @param {"prompt"|"resource"} kind
 */
function mcpPrimitiveDeclaration($, kind) {
  const isResource = kind === "resource";

  return () => {
    let hasAnnotations = false;
    let hasDescription = false;
    let hasDocs = false;
    let hasGuid = false;
    let hasHistory = false;
    let hasIcons = false;
    let hasInput = false;
    let hasMiddleware = false;
    let hasMimeType = false;
    let hasResponse = false;
    let hasStack = false;
    let hasTags = false;
    let hasTitle = false;
    let uriToken = null;
    const inputFields = {};

    $.sectionStack.push(`${kind}Declaration`);
    // Allow leading comments and newlines before the declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.OR([
      { GATE: () => !isResource, ALT: () => $.CONSUME(PromptToken) },
      { GATE: () => isResource, ALT: () => $.CONSUME(ResourceToken) },
    ]);
    const nameToken = $.OR1([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, kind);
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        { ALT: () => $.SUBRULE($.commentBlockFn) },
        {
          GATE: () => isResource && !hasAnnotations,
          ALT: () => {
            hasAnnotations = true;
            $.SUBRULE($.mcpResourceAnnotationsClause);
          },
        },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
          },
        },
        {
          GATE: () => !hasGuid,
          ALT: () => {
            hasGuid = true;
            $.SUBRULE($.guidFieldAttribute);
          },
        },
        {
          GATE: () => !hasHistory,
          ALT: () => {
            hasHistory = true;
            $.SUBRULE($.historyClause);
          },
        },
        {
          GATE: () => !hasIcons,
          ALT: () => {
            hasIcons = true;
            $.SUBRULE($.mcpIconsClause);
          },
        },
        {
          GATE: () => !hasInput,
          ALT: () => {
            hasInput = true;
            $.SUBRULE($.inputClause, { ARGS: [inputFields] });
          },
        },
        {
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
          },
        },
        {
          GATE: () => isResource && !hasMimeType,
          ALT: () => {
            hasMimeType = true;
            $.CONSUME(MimeTypeToken); // "mime_type"
            $.CONSUME(EqualToken); // "="
            const value = $.CONSUME1(StringLiteral);
            if (!MIME_TYPE.test(getVarName(value))) {
              $.addInvalidValueError(
                value,
                `resource mime_type must be a MIME type such as text/markdown — got "${getVarName(value)}"`,
              );
            }
          },
        },
        {
          GATE: () => !hasResponse,
          ALT: () => {
            hasResponse = true;
            $.SUBRULE($.responseClause);
          },
        },
        {
          GATE: () => !hasStack,
          ALT: () => {
            hasStack = true;
            $.SUBRULE($.stackClause);
          },
        },
        {
          GATE: () => !hasTags,
          ALT: () => {
            hasTags = true;
            $.SUBRULE($.tagsAttribute);
          },
        },
        {
          GATE: () => !hasTitle,
          ALT: () => {
            hasTitle = true;
            $.SUBRULE($.mcpTitleClause);
          },
        },
        {
          GATE: () => isResource && !uriToken,
          ALT: () => {
            $.CONSUME(UriToken); // "uri"
            $.CONSUME1(EqualToken); // "="
            uriToken = $.CONSUME2(StringLiteral);
          },
        },
      ]);
    });

    if (!isResource && !hasInput) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing an input clause`,
      );
    }

    if (!hasStack) {
      $.addMissingError(
        parent,
        `{} ${nameToken.image} is missing a stack clause`,
      );
    }

    if (isResource) {
      $.ACTION(() => {
        if (!uriToken) {
          $.addMissingError(parent, `{} ${nameToken.image} is missing a uri`);
          return;
        }
        const { problem, variables } = parseResourceUri(getVarName(uriToken));
        // the top-level fields only; the symbol table also holds nested
        // object fields, and records an object input's type as "enum"
        const inputs = {};
        for (const [name, field] of Object.entries(inputFields)) {
          inputs[name] = { type: field.typeToken.image, iterable: field.iterable };
        }
        const inputProblem = problem
          ? problem
          : resourceInputProblem(variables, inputs);
        if (inputProblem) {
          $.addInvalidValueError(uriToken, inputProblem);
        }
      });
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
