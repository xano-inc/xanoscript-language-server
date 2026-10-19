import { tokenMatcher } from "chevrotain";
import {
  ColonToken,
  CommaToken,
  LCurly,
  LSquare,
  Minus,
  RCurly,
  RSquare,
} from "../../lexer/control.js";
import {
  FloatLiteral,
  IntegerLiteral,
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../../lexer/literal.js";
import { MultiLineStringToken } from "../../lexer/multiline.js";
import {
  DotToken,
  FalseToken,
  Identifier,
  NewlineToken,
  NullToken,
  TrueToken,
} from "../../lexer/tokens.js";

/**
 * A rule's `params` as values, each with the token it was written at, so a problem the catalogue
 * finds can be pointed at in the source.
 *
 * The parser has already accepted the tokens as a constant (the schema machinery's
 * `[constant]`); this only reads them back. Anything that is not a plain literal (a variable, a
 * filter, an expression) comes back as `{kind: "expression"}`: the platform refuses those with
 * "Policy parameters must be literal values."
 *
 * @typedef {{kind: "object", token: Object, entries: {key: string, keyToken: Object, value: PolicyValue}[]}
 *   | {kind: "array", token: Object, items: PolicyValue[]}
 *   | {kind: "string"|"number"|"boolean"|"null", token: Object, value: any}
 *   | {kind: "expression", token: Object}} PolicyValue
 */

/** Whether a token is of a type (or one of its categories). */
export const isA = (token, type) => !!token && tokenMatcher(token, type);

/** A catalogue entry's own property, never an inherited one (`constructor`, `toString`). */
export const own = (object, key) => object && Object.hasOwn(object, key) ? object[key] : undefined;

/** Native redacted: double quotes use C escapes, single quotes only \\ and \'. */
export function policyStringValue(image) {
  if (image.startsWith('"""') || image.startsWith("'''")) {
    return image.slice(3, -3).replace(/^\r?\n/, "").replace(/\r?\n[ ]*$/, "");
  }
  if (image.startsWith('"')) {
    const bytes = [];
    const encoder = new TextEncoder();
    const controls = { a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11 };
    for (const match of image.slice(1, -1).matchAll(/\\([0-7]{1,3}|x[\da-fA-F]{1,2}|[\s\S])|([^\\]+)/g)) {
      const escape = match[1];
      if (escape && /^[0-7]/.test(escape)) bytes.push(parseInt(escape, 8) & 255);
      else if (escape && /^x[\da-fA-F]/.test(escape)) bytes.push(parseInt(escape.slice(1), 16));
      else if (escape && Object.hasOwn(controls, escape)) bytes.push(controls[escape]);
      else for (const byte of encoder.encode(escape ?? match[2])) bytes.push(byte);
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
  }
  return image.slice(1, -1).replace(/\\([\\'])/g, "$1");
}

const unquote = (token) => policyStringValue(token.image);

const isString = (token) =>
  isA(token, StringLiteral) ||
  isA(token, SingleQuotedStringLiteral) ||
  isA(token, MultiLineStringToken);

const isNumber = (token) =>
  isA(token, IntegerLiteral) || isA(token, FloatLiteral);

/** A token that ends a value inside an object or array, or the value itself. */
const isBoundary = (token) =>
  !token ||
  isA(token, CommaToken) ||
  isA(token, NewlineToken) ||
  isA(token, RCurly) ||
  isA(token, RSquare);

/**
 * Read one value from `tokens[from..to]` (inclusive).
 * @param {Object[]} tokens
 * @param {number} from
 * @param {number} to
 * @returns {PolicyValue|null}
 */
export function readPolicyLiteral(tokens, from, to) {
  let i = from;
  const peek = (ahead = 0) => (i + ahead <= to ? tokens[i + ahead] : null);

  const skipLayout = () => {
    while (isA(peek(), NewlineToken) || isA(peek(), CommaToken)) i++;
  };

  /** Skip the rest of a non-literal value, up to the separator that ends it. */
  const expression = (token) => {
    let depth = 0;
    while (peek()) {
      const t = peek();
      if (isA(t, LCurly) || isA(t, LSquare)) depth++;
      else if (isA(t, RCurly) || isA(t, RSquare)) {
        if (depth === 0) break;
        depth--;
      } else if (depth === 0 && (isA(t, CommaToken) || isA(t, NewlineToken)))
        break;
      i++;
    }
    return { kind: "expression", token };
  };

  /** A scalar is literal only when nothing (a filter, an operator) follows it. */
  const scalar = (node) => (isBoundary(peek()) ? node : expression(node.token));

  const value = () => {
    const token = peek();
    if (!token) return null;

    if (isA(token, LCurly)) {
      i++;
      const entries = [];
      for (;;) {
        skipLayout();
        const keyToken = peek();
        if (!keyToken) break;
        if (isA(keyToken, RCurly)) {
          i++;
          break;
        }
        let key;
        if (isString(keyToken)) {
          key = unquote(keyToken);
          i++;
        } else if (isA(keyToken, Identifier)) {
          key = keyToken.image;
          i++;
          while (isA(peek(), DotToken) && isA(peek(1), Identifier)) {
            key += "." + peek(1).image;
            i += 2;
          }
        } else {
          return expression(token);
        }
        if (isA(peek(), ColonToken)) i++;
        entries.push({ key, keyToken, value: value() });
      }
      return scalar({ kind: "object", token, entries });
    }

    if (isA(token, LSquare)) {
      i++;
      const items = [];
      for (;;) {
        skipLayout();
        const next = peek();
        if (!next) break;
        if (isA(next, RSquare)) {
          i++;
          break;
        }
        const before = i;
        items.push(value());
        if (i === before) i++; // never loop on a token nothing can read
      }
      return scalar({ kind: "array", token, items });
    }

    if (isString(token)) {
      i++;
      return scalar({ kind: "string", token, value: unquote(token) });
    }
    if (isA(token, Minus) && isNumber(peek(1))) {
      const number = peek(1);
      i += 2;
      return scalar({ kind: "number", token, value: -Number(number.image) });
    }
    if (isNumber(token)) {
      i++;
      return scalar({ kind: "number", token, value: Number(token.image) });
    }
    if (isA(token, TrueToken) || isA(token, FalseToken)) {
      i++;
      return scalar({
        kind: "boolean",
        token,
        value: isA(token, TrueToken),
      });
    }
    if (isA(token, NullToken)) {
      i++;
      return scalar({ kind: "null", token, value: null });
    }
    return expression(token);
  };

  return value();
}

/**
 * The plain JavaScript value of a node (objects and arrays included), or undefined for an
 * expression.
 * @param {PolicyValue|null} node
 */
export function policyLiteralValue(node) {
  if (!node) return undefined;
  switch (node.kind) {
    case "object": {
      const out = Object.create(null);
      for (const entry of node.entries) {
        out[entry.key] = policyLiteralValue(entry.value);
      }
      return out;
    }
    case "array":
      return node.items.map(policyLiteralValue);
    case "expression":
      return undefined;
    default:
      return node.value;
  }
}
