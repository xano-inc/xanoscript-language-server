import { getPolicyCatalogue } from "../parser/policy/catalogue.js";
import {
  checkMarkdown,
  paramMarkdown,
  paramValues,
} from "../parser/policy/policyDocs.js";
import { own, policyStringValue } from "../parser/policy/policyLiteral.js";

/**
 * Completion inside a `policy` document, all of it read from the check catalogue: the policy's and
 * a rule's fields and their closed values (the catalogue's `document`), `rule`, check ids, a
 * check's params, an object param's fields and a param's closed values.
 *
 * The text before the cursor is usually unfinished (an open string, a half-typed key), which the
 * grammar cannot parse, so this reads it with a small tolerant scanner: strings, words,
 * brackets, `=`, `:`, `,` and line breaks, tracking which block each `{` or `[` opened.
 *
 * Items use LSP CompletionItemKind numbers and carry a `textEdit` whose range is in the
 * coordinates of `prefix`, so a check id with dots replaces what was typed as a whole.
 */

/** LSP CompletionItemKind. */
const KIND = {
  Field: 5,
  Property: 10,
  Value: 12,
  Keyword: 14,
  EnumMember: 20,
};

/** A document field's closed values, as completion offers them (`bool` is true and false). */
function fieldValues(spec) {
  if (spec?.type === "bool") return ["true", "false"];
  return spec?.values ?? null;
}

/** Completion documentation for a document field. */
function fieldDoc(name, spec) {
  if (!spec?.description) return undefined;
  const values = fieldValues(spec);
  const lines = [`**${name}** (${spec.type ?? "string"})`, "", spec.description];
  if (values) lines.push("", `One of: ${values.map((v) => "`" + v + "`").join(", ")}.`);
  if (spec.default !== undefined) lines.push("", `Default: \`${spec.default}\``);
  return { kind: "markdown", value: lines.join("\n") };
}

/**
 * Split the text before the cursor into the few token kinds completion needs.
 * @param {string} text
 */
function scan(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") {
      tokens.push({ t: "nl", start: i, end: i + 1 });
      i++;
    } else if (c === " " || c === "\t" || c === "\r") {
      i++;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (text.startsWith('"""', i) || text.startsWith("'''", i)) {
      const close = text.indexOf(text.slice(i, i + 3), i + 3);
      const end = close === -1 ? text.length : close + 3;
      tokens.push({
        t: "str",
        start: i,
        end,
        quote: 3,
        open: close === -1,
        value: text.slice(i + 3, close === -1 ? text.length : close),
      });
      i = end;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== "\n") {
        j += text[j] === "\\" ? 2 : 1;
      }
      const open = j >= text.length;
      const end = open ? text.length : j + 1;
      tokens.push({
        t: "str",
        start: i,
        end,
        quote: 1,
        open,
        value: text.slice(i + 1, open ? text.length : j),
      });
      i = end;
    } else if ("{}[]=:,".includes(c)) {
      tokens.push({ t: c, start: i, end: i + 1 });
      i++;
    } else if (/[\w$.-]/.test(c)) {
      let j = i;
      while (j < text.length && /[\w$.-]/.test(text[j])) j++;
      tokens.push({ t: "word", start: i, end: j, value: text.slice(i, j) });
      i = j;
    } else {
      tokens.push({ t: "other", start: i, end: i + 1 });
      i++;
    }
  }
  return tokens;
}

/** The first word on the line holding token `k` (`rule` in `rule {`, `policy` in `policy KEY {`). */
function lineHead(tokens, k) {
  if (tokens[k - 1]?.t === "word" && tokens[k - 1].value === "rule" && tokens[k - 2]?.value !== "policy") return "rule";
  let j = k;
  while (j > 0 && tokens[j - 1].t !== "nl") j--;
  return tokens[j]?.t === "word" ? tokens[j].value : null;
}

/** The key a value at token `k` belongs to: the word before the `=` or `:` just before it. */
function keyBefore(tokens, k) {
  const sep = tokens[k - 1];
  if (sep && (sep.t === "=" || sep.t === ":") && tokens[k - 2]?.t === "word") {
    return tokens[k - 2].value;
  }
  return null;
}

/**
 * Where the cursor is: the stack of open blocks, and what is being typed.
 * @param {string} prefix
 */
function contextOf(prefix) {
  const tokens = scan(prefix);
  const frames = [];
  const top = () => frames[frames.length - 1];

  tokens.forEach((token, k) => {
    if (token.t === "{" || token.t === "[") {
      frames.push({
        open: token.t,
        owner: keyBefore(tokens, k) ?? (token.t === "{" ? lineHead(tokens, k) : null),
        keys: new Set(),
        check: null,
      });
    } else if (token.t === "}" || token.t === "]") {
      frames.pop();
    } else if (token.t === "word" && (tokens[k + 1]?.t === "=" || tokens[k + 1]?.t === ":")) {
      top()?.keys.add(token.value);
    } else if (token.t === "str" && !token.open && keyBefore(tokens, k) === "check") {
      if (top()) top().check = policyStringValue(prefix.slice(token.start, token.end)).trim();
    }
  });

  const last = tokens[tokens.length - 1];
  const touching = last && last.end === prefix.length;

  // Typing inside a string: a value.
  if (touching && last.t === "str" && last.open) {
    const k = tokens.length - 1;
    const prev = tokens[k - 1];
    const inList = prev && (prev.t === "[" || prev.t === ",") && top()?.open === "[";
    return {
      frames,
      kind: "value",
      key: inList ? top().owner : keyBefore(tokens, k),
      inList,
      quoted: true,
      start: last.start + last.quote,
    };
  }

  // A bare word being typed: a key, or an unquoted value after `=` / `:`.
  const typing = touching && last.t === "word" ? last : null;
  const k = typing ? tokens.length - 1 : tokens.length;
  const prev = tokens[k - 1];
  if (!prev || prev.t === "nl" || prev.t === "{" || prev.t === ",") {
    if (top()?.open === "[") return null;
    return {
      frames,
      kind: "key",
      start: typing ? typing.start : prefix.length,
    };
  }
  if (prev.t === "=" || prev.t === ":") {
    return {
      frames,
      kind: "value",
      key: keyBefore(tokens, k),
      inList: false,
      quoted: false,
      start: typing ? typing.start : prefix.length,
    };
  }
  if (prev.t === "[" && top()?.open === "[") {
    return {
      frames,
      kind: "value",
      key: top().owner,
      inList: true,
      quoted: false,
      start: typing ? typing.start : prefix.length,
    };
  }
  return null;
}

/** An LSP position within `text`. */
function positionAt(text, offset) {
  const before = text.slice(0, offset);
  const line = before.split("\n").length - 1;
  return { line, character: offset - (before.lastIndexOf("\n") + 1) };
}

/**
 * @param {string} prefix the document text before the cursor
 * @returns {Object[]} LSP completion items; empty when there is nothing to offer here
 */
export function getPolicyCompletions(prefix) {
  const context = contextOf(prefix);
  if (!context) return [];
  const { frames } = context;
  const catalogue = getPolicyCatalogue();
  const range = {
    start: positionAt(prefix, context.start),
    end: positionAt(prefix, prefix.length),
  };
  const item = (label, kind, extra = {}) => ({
    label,
    kind,
    ...extra,
    textEdit: { range, newText: extra.newText ?? label },
  });
  const value = (label, kind, extra = {}) =>
    item(label, kind, {
      ...extra,
      newText: context.quoted ? label : `"${label}"`,
      filterText: context.quoted ? label : `"${label}"`,
    });

  const [policy, rule, params, nested] = frames;
  if (!policy || policy.owner !== "policy") return [];
  const ruleOpen = rule && rule.open === "{" && rule.owner === "rule";
  const check =
    ruleOpen && rule.check ? (catalogue.checks.get(rule.check) ?? null) : null;
  const policyFields = catalogue.document?.fields ?? {};
  const ruleFields = catalogue.document?.rule ?? {};
  const fieldItem = (name, spec) =>
    item(name, KIND.Property, {
      detail: spec?.type,
      documentation: fieldDoc(name, spec),
    });

  if (context.kind === "key") {
    if (frames.length === 1) {
      return [
        ...Object.entries(policyFields)
          .filter(([name]) => !policy.keys.has(name))
          .map(([name, spec]) => fieldItem(name, spec)),
        item("rule", KIND.Keyword, { detail: "rule { check = \"...\" }" }),
      ];
    }
    if (frames.length === 2 && ruleOpen) {
      return Object.entries(ruleFields)
        .filter(([name]) => !rule.keys.has(name))
        .map(([name, spec]) => fieldItem(name, spec));
    }
    if (frames.length === 3 && ruleOpen && params.owner === "params" && check) {
      const applicable = new Set((check.scope_fields ?? []).map((field) => field.name));
      return Object.entries(check.params ?? {})
        .filter(([name]) => !params.keys.has(name))
        .filter(([name]) => !catalogue.scopeFields.has(name) || applicable.has(name))
        .map(([name, spec]) =>
          item(name, KIND.Property, {
            detail: `${spec.type ?? "string"}${spec.required ? ", required" : ""}`,
            documentation: { kind: "markdown", value: paramMarkdown(check.id, name, spec) },
            sortText: `${spec.required ? 0 : 1}${catalogue.scopeFields.has(name) ? 1 : 0}${name}`,
          })
        );
    }
    if (frames.length === 4 && ruleOpen && params.owner === "params" && check && nested.open === "{") {
      const spec = own(check.params, nested.owner);
      return Object.entries(spec?.properties ?? {})
        .filter(([name]) => !name.startsWith("<") && !nested.keys.has(name))
        .map(([name, property]) =>
          item(name, KIND.Field, {
            detail: property.type ?? "string",
            documentation: {
              kind: "markdown",
              value: paramMarkdown(check.id, `${nested.owner}.${name}`, property),
            },
          })
        );
    }
    return [];
  }

  // A value.
  const closed = frames.length === 1 ? fieldValues(own(policyFields, context.key)) : null;
  if (closed) {
    const bool = policyFields[context.key].type === "bool";
    if (bool && context.quoted) return [];
    return closed.map((name) =>
      bool
        ? item(name, KIND.EnumMember, { newText: name, filterText: name })
        : value(name, KIND.EnumMember)
    );
  }
  if (frames.length === 2 && ruleOpen && context.key === "check") {
    return catalogue.ids.map((id) => {
      const entry = catalogue.checks.get(id);
      return value(id, KIND.Value, {
        detail: entry.label,
        documentation: { kind: "markdown", value: checkMarkdown(entry, catalogue) },
      });
    });
  }
  if (!check || params?.owner !== "params") return [];

  // Inside params: the param (or its list items, or an object param's field) with closed values.
  let spec = null;
  let path = null;
  if (frames.length === 3 && !context.inList) {
    spec = own(check.params, context.key);
    path = context.key;
  } else if (frames.length === 4 && context.inList) {
    spec = own(check.params, context.key);
    path = context.key;
  } else if (frames.length === 4 && nested.open === "{" && !context.inList) {
    spec = own(own(check.params, nested.owner)?.properties, context.key);
    path = `${nested.owner}.${context.key}`;
  }
  const bool = spec?.type === "bool";
  if (bool && context.quoted) return [];
  const values = bool ? ["true", "false"] : paramValues(spec);
  if (!values) return [];
  return values
    .filter((option) => option !== "")
    .map((option) =>
      (bool ? item : value)(String(option), KIND.EnumMember, {
        documentation: { kind: "markdown", value: paramMarkdown(check.id, path, spec) },
      })
    );
}
