import { CommentToken } from "../lexer/comment.js";
import {
  ColonToken,
  EqualToken,
  LCurly,
  LSquare,
  RCurly,
  RSquare,
} from "../lexer/control.js";
import { SingleQuotedStringLiteral, StringLiteral } from "../lexer/literal.js";
import { PolicyToken } from "../lexer/policy.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";
import { getPolicyCatalogue } from "../parser/policy/catalogue.js";
import { checkMarkdown, paramMarkdown } from "../parser/policy/policyDocs.js";
import { isA, own, policyStringValue } from "../parser/policy/policyLiteral.js";
import { HoverMessageProvider } from "./HoverMessageProvider.js";

const isString = (token) => isA(token, StringLiteral) || isA(token, SingleQuotedStringLiteral);

const unquote = policyStringValue;

/** The key a value at `k` belongs to: the word before the `=` or `:` just before it. */
function keyBefore(tokens, k) {
  const sep = tokens[k - 1];
  if ((isA(sep, EqualToken) || isA(sep, ColonToken)) && isA(tokens[k - 2], Identifier)) {
    return tokens[k - 2].image;
  }
  return null;
}

/** The first word on the line holding token `k`. */
function lineHead(tokens, k) {
  if (tokens[k - 1]?.image === "rule" && tokens[k - 2]?.image !== "policy") return "rule";
  let j = k;
  while (j > 0 && !isA(tokens[j - 1], NewlineToken)) j--;
  return isA(tokens[j], Identifier) ? tokens[j].image : null;
}

/**
 * The blocks open at `index`, outermost first, each with the check its rule names (read from the
 * whole rule, so a `check` written after `params` still counts).
 */
function framesAt(tokens, index) {
  const stack = [];
  let at = null;
  for (let k = 0; k < tokens.length; k++) {
    if (k === index) at = [...stack];
    const token = tokens[k];
    if (isA(token, LCurly) || isA(token, LSquare)) {
      stack.push({
        owner: keyBefore(tokens, k) ?? (isA(token, LCurly) ? lineHead(tokens, k) : null),
        check: null,
      });
    } else if (isA(token, RCurly) || isA(token, RSquare)) {
      stack.pop();
      // Past the block that holds `index`: nothing later can change what it names.
      if (at && stack.length < 2) break;
    } else if (isString(token) && keyBefore(tokens, k) === "check" && stack.length) {
      stack[stack.length - 1].check = unquote(token.image).trim();
    }
  }
  return at ?? [];
}

/** Markdown for a policy or rule field, from the catalogue's `document`. */
function fieldMarkdown(name, spec) {
  const lines = [`**${name}** (${spec.type ?? "string"}${spec.required ? ", required" : ""})`];
  if (spec.description) lines.push("", spec.description);
  if (spec.values?.length) lines.push("", `One of: ${spec.values.map((v) => "`" + v + "`").join(", ")}.`);
  if (spec.default !== undefined) lines.push("", `Default: \`${spec.default}\``);
  return lines.join("\n");
}

/**
 * Hover inside a `policy` document: a policy or rule field shows what it is for; a rule's check id
 * shows what the check does and its params; a param (or an object param's field) shows its type,
 * values, default and description. All of it is rendered from the check catalogue the host loaded.
 */
export class PolicyMessageProvider extends HoverMessageProvider {
  /**
   * @returns {{kind: "field", name: string, spec: Object} | {kind: "check", check: Object}
   *   | {kind: "param", check: Object, path: string, spec: Object} | null}
   */
  resolve(index, tokens) {
    const head = tokens.find((t) => !isA(t, NewlineToken) && !isA(t, CommentToken));
    if (!isA(head, PolicyToken)) return null;
    const catalogue = getPolicyCatalogue();
    if (!catalogue.source) return null;

    const token = tokens[index];
    const frames = framesAt(tokens, index);
    const [policy, rule, params, nested] = frames;
    if (policy?.owner !== "policy") return null;

    // A field name: `name =` in the policy or in a rule.
    if (isA(token, Identifier) && isA(tokens[index + 1], EqualToken)) {
      const fields =
        frames.length === 1
          ? catalogue.document?.fields
          : frames.length === 2 && rule?.owner === "rule"
            ? catalogue.document?.rule
            : null;
      const spec = own(fields, token.image);
      return spec ? { kind: "field", name: token.image, spec } : null;
    }
    if (rule?.owner !== "rule") return null;

    if (frames.length === 2 && isString(token) && keyBefore(tokens, index) === "check") {
      const check = catalogue.checks.get(unquote(token.image).trim());
      return check ? { kind: "check", check } : null;
    }

    const check = catalogue.checks.get(rule.check ?? "");
    if (!check || params?.owner !== "params" || !isA(token, Identifier) || !isA(tokens[index + 1], ColonToken)) {
      return null;
    }
    if (frames.length === 3) {
      const spec = own(check.params, token.image);
      return spec ? { kind: "param", check, path: token.image, spec } : null;
    }
    if (frames.length === 4) {
      const spec = own(own(check.params, nested.owner)?.properties, token.image);
      return spec
        ? { kind: "param", check, path: `${nested.owner}.${token.image}`, spec }
        : null;
    }
    return null;
  }

  isMatch(index, tokens) {
    return this.resolve(index, tokens) !== null;
  }

  render(index, tokens) {
    const found = this.resolve(index, tokens);
    if (!found) return "";
    if (found.kind === "field") return fieldMarkdown(found.name, found.spec);
    return found.kind === "check"
      ? checkMarkdown(found.check, getPolicyCatalogue())
      : paramMarkdown(found.check.id, found.path, found.spec);
  }
}
