import { policyLiteralValue } from "./policyLiteral.js";

/**
 * One rule's check id and params against the check catalogue.
 *
 * Everything here is read from the catalogue the host loaded (see `catalogue.js`): the check
 * ids, each check's params with their types, closed value sets, nested fields, `required`,
 * `requires_one_of`, `minimum` and `non_empty`, and the scope fields that apply to it. Nothing
 * names a check. The findings are worded like the platform's refusals without their `rule[i] ("KEY.Rn"): params:` prefix, since a diagnostic
 * already points at the place; they are a preview, and the platform's own answer on save decides.
 * Where the platform stops at the first refusal, this reports every problem, one per param.
 *
 * Two bounds are the platform's own constants, not the catalogue's: a string or string[] param
 * holds at most `STRING_MAX_LENGTH` characters, and a name longer than `NEAREST_MAX_LENGTH` bytes
 * gets no near miss.
 *
 * Check-specific rules the catalogue does not publish (per-check validation,
 * renamed ids and params, statement wildcards) are left to the platform.
 *
 * Whether a value is a literal at all, and duplicate names, are the block's shape, not the
 * catalogue's: the parser reports those (policy_parser.js) and this skips such values.
 */

/** The platform's limit on the longest string a string or string[] param may hold, in characters. */
const STRING_MAX_LENGTH = 1024;

/** The platform's limit on the longest name, in bytes, a near miss is looked for. */
const NEAREST_MAX_LENGTH = 128;

/** Edit distance, as PHP's `levenshtein` (insert, delete and replace all cost 1). */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * The closest names to a misspelling, nearest first, at most two, as the platform suggests them: within
 * three edits, or one containing the other. A name longer than `NEAREST_MAX_LENGTH` bytes gets
 * none, since edit distance costs the product of the two lengths per candidate.
 * @param {string} wanted
 * @param {string[]} candidates
 * @returns {string[]}
 */
export function nearestNames(wanted, candidates) {
  wanted = String(wanted).trim();
  if (wanted === "" || new TextEncoder().encode(wanted).length > NEAREST_MAX_LENGTH) return [];
  wanted = wanted.toLowerCase();
  const scored = [];
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const distance = levenshtein(lower, wanted);
    if (distance > 3 && !lower.includes(wanted) && !wanted.includes(lower)) {
      continue;
    }
    scored.push([candidate, distance]);
  }
  scored.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return scored.slice(0, 2).map(([name]) => name);
}

/** "Did you mean …? " naming the nearest candidates to a misspelling, or "" when none is near. */
export function didYouMean(name, candidates) {
  const near = nearestNames(name, candidates);
  return near.length ? `Did you mean ${near.map((n) => `"${n}"`).join(" or ")}? ` : "";
}

/** Whether a param counts as provided: set when not null/false, not an empty or blank string, not an empty list or object. */
function provided(value) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * A param's value as the platform validates it: one left out, or written
 * as `null` when its type is not `any`, is its default.
 */
const inForce = (literal, schema, name) =>
  Object.hasOwn(literal, name) && (literal[name] !== null || schema[name]?.type === "any")
    ? literal[name]
    : schema[name]?.default;

const isEmptyList = (node) =>
  (node.kind === "array" && node.items.length === 0) ||
  (node.kind === "object" && node.entries.length === 0);

/** The sentence for a check id that is not in the catalogue. */
export function unknownCheckMessage(id, ids) {
  return `"${id}" is not a policy check. ${didYouMean(id, ids)}`.trim();
}

/**
 * Whether a value has its param's declared type and values.
 * @returns {{token: Object, message: string}|null}
 */
function coerce(node, spec, checkId, name) {
  const type = String(spec?.type ?? "string");
  const fail = (what, token = node.token) => ({
    token,
    message: `param "${name}" of check "${checkId}" must ${what}.`,
  });

  switch (type) {
    case "integer": {
      const whole = node.kind === "number" && Number.isFinite(node.value) && Math.floor(node.value) === node.value;
      const minimum = spec.minimum;
      if (!whole || (minimum !== undefined && node.value < minimum)) {
        return fail(`be a whole number${minimum !== undefined ? ` of at least ${minimum}` : ""}`);
      }
      // The platform's integer limit: past 2^53 - 1 a whole number is no longer exact.
      if (Math.abs(node.value) > Number.MAX_SAFE_INTEGER) {
        return fail(`be a whole number no larger than ${Number.MAX_SAFE_INTEGER}`);
      }
      return null;
    }
    case "number":
      return node.kind === "number" && Number.isFinite(node.value) ? null : fail("be a finite number");
    case "object":
      // PHP reads an empty list and an empty object alike, so `[]` passes as an object.
      return node.kind === "object" || isEmptyList(node) ? null : fail("be an object");
    case "array":
      return node.kind === "array" || isEmptyList(node) ? null : fail("be an array");
    case "any":
      return null;
    case "string[]": {
      if (!(node.kind === "array" || isEmptyList(node))) {
        return fail("be a list of strings");
      }
      const values = spec.items?.values ?? spec.values ?? [];
      for (const item of node.items ?? []) {
        if (!item || item.kind !== "string") {
          return fail("be a list of strings", item?.token);
        }
        if (values.length && !values.includes(item.value)) {
          return fail(`contain only: ${values.join(", ")}`, item.token);
        }
        if (item.value.trim() === "") {
          return fail("not contain empty strings", item.token);
        }
        if ([...item.value].length > STRING_MAX_LENGTH) {
          return fail(`list strings of at most ${STRING_MAX_LENGTH} characters`, item.token);
        }
      }
      return null;
    }
    case "bool":
      return node.kind === "boolean" ? null : fail("be a boolean");
    default: {
      if (node.kind !== "string") return fail("be a string");
      if ([...node.value].length > STRING_MAX_LENGTH) {
        return fail(`be at most ${STRING_MAX_LENGTH} characters`);
      }
      const values = spec?.values ?? [];
      if (values.length && !values.includes(node.value)) {
        const named = values.filter((value) => String(value) !== "");
        return fail(`be one of: ${named.join(", ")}${named.length !== values.length ? " (or omit it)" : ""}`);
      }
      return null;
    }
  }
}

/** An object param's declared fields, or null when it has none or its keys are the author's own (`<placeholder>`). */
function closedProperties(spec) {
  const properties = spec?.properties;
  if (spec?.type !== "object" || !properties || typeof properties !== "object") return null;
  const keys = Object.keys(properties);
  if (keys.length === 0 || keys.some((key) => key.startsWith("<"))) return null;
  return properties;
}

/**
 * Why a set scope field cannot change what a rule of this check selects, or null when it can,
 * read from the check's published `scope_fields` (the same reading as the Xano editor's rule form).
 */
function inapplicableScope(check, name, literal) {
  const field = (check.scope_fields ?? []).find((item) => item?.name === name);
  if (!field) {
    return `"${name}" does not apply to check "${check.id}", so it cannot change what this rule selects.`;
  }
  for (const [param, condition] of Object.entries(field.applies_when ?? {})) {
    const value = inForce(literal, check.params ?? {}, param);
    if (condition === "non_empty") {
      if (!provided(value)) {
        return `"${name}" applies to check "${check.id}" only when ${param} is set.`;
      }
    } else if (Array.isArray(condition) && !condition.includes(String(value ?? ""))) {
      return `"${name}" applies to check "${check.id}" only when ${param} is ${condition.join(" or ")}.`;
    }
  }
  return null;
}

/**
 * @param {{checkId: string|null, checkToken: Object|null, paramsToken: Object|null,
 *   params: import('./policyLiteral.js').PolicyValue|null, ruleToken: Object}} rule
 * @param {ReturnType<import('./catalogue.js').getPolicyCatalogue>} catalogue
 * @returns {{token: Object, message: string, advisory?: boolean}[]} the problems, one per param;
 *   `advisory` marks a finding that mirrors platform logic beyond the published schema (a scope
 *   field's applicability, an object param's "one of" fields), which a host shows as a warning
 */
export function validatePolicyRule(rule, catalogue) {
  const out = [];
  const report = (token, message) => out.push({ token, message });
  const advise = (token, message) => out.push({ token, message, advisory: true });

  if (!catalogue?.checks?.size || rule.checkId === null) return out;

  const check = catalogue.checks.get(rule.checkId);
  if (!check) {
    report(rule.checkToken ?? rule.ruleToken, unknownCheckMessage(rule.checkId, catalogue.ids));
    return out;
  }

  const id = check.id;
  const schema = check.params ?? {};
  const anchor = rule.paramsToken ?? rule.checkToken ?? rule.ruleToken;
  const params = rule.params?.kind === "null" || (rule.params?.kind === "array" && !rule.params.items.length)
    ? null : rule.params;

  // Not an object (the parser has said so): nothing to hold against the check.
  if (params && params.kind !== "object") return out;

  // Unknown names, in the order they are written; a repeated name counts once.
  const given = new Map();
  for (const entry of params?.entries ?? []) {
    if (given.has(entry.key)) continue;
    given.set(entry.key, entry);
    if (!Object.hasOwn(schema, entry.key)) {
      const names = Object.keys(schema);
      report(
        entry.keyToken,
        `unknown param "${entry.key}" for check "${id}". ${didYouMean(entry.key, names)}Accepted params: ${names.join(", ") || "none"}.`
      );
    }
  }

  const literal = policyLiteralValue(params) ?? {};

  for (const [name, spec] of Object.entries(schema)) {
    const entry = given.get(name);
    const node = entry?.value;
    const has = !!node && node.kind !== "expression" && (node.kind !== "null" || spec.type === "any");
    if (!has) {
      if (spec.required && (!node || node.kind === "null")) {
        report(anchor, `check "${id}" requires param "${name}".`);
      }
      continue;
    }

    const problem = coerce(node, spec, id, name);
    if (problem) {
      report(problem.token, problem.message);
      continue;
    }

    if ((spec.required || spec.non_empty) && ((node.kind === "string" && node.value.trim() === "") || isEmptyList(node))) {
      report(node.token, `check "${id}": ${name} must not be empty.`);
      continue;
    }

    const properties = closedProperties(spec);
    if (properties && node.kind === "object" && node.entries.length) {
      const seen = new Set();
      for (const field of node.entries) {
        seen.add(field.key);
        const property = Object.hasOwn(properties, field.key) ? properties[field.key] : null;
        if (!property) {
          report(field.keyToken, `check "${id}": Unknown ${name} field: ${field.key}`);
          continue;
        }
        if (!field.value || field.value.kind === "expression") continue;
        const nested = coerce(field.value, property, id, `${name}.${field.key}`);
        if (nested) {
          report(nested.token, nested.message);
        } else if (property.type === "string" && field.value.value.trim() === "") {
          report(field.value.token, `check "${id}": ${name}.${field.key} must not be empty.`);
        }
      }
      for (const [key, property] of Object.entries(properties)) {
        if (property.required && !seen.has(key)) {
          report(entry.keyToken, `check "${id}": ${name}.${key} is required.`);
        }
      }
      const oneOf = spec.requires_one_of ?? [];
      const value = literal[name] ?? {};
      if (oneOf.length && !oneOf.some((key) => provided(value[key]))) {
        advise(entry.keyToken, `check "${id}": ${name} requires ${oneOf.map((key) => `${name}.${key}`).join(" or ")}.`);
      }
    }
  }

  // "One of A or B", with each param's default in force where it is not set.
  const oneOf = check.requires_one_of ?? [];
  if (oneOf.length) {
    if (!oneOf.some((name) => provided(inForce(literal, schema, name)))) {
      report(anchor, `check "${id}" requires ${oneOf.join(" or ")}.`);
    }
  }

  // A scope field set on a check it cannot narrow (the platform refuses it on save).
  for (const [name, entry] of given) {
    if (catalogue.scopeFields?.has(name) && name in schema && provided(literal[name])) {
      const why = inapplicableScope(check, name, literal);
      if (why) advise(entry.keyToken, why);
    }
  }

  // A param set for a value of the check's kind param it does not apply to (`applies_when` on the
  // param: object.naming's version_required applies to name_kind endpoint_path only). The platform
  // refuses it on save.
  for (const [name, entry] of given) {
    const conditions = Object.hasOwn(schema, name) ? schema[name]?.applies_when : null;
    if (!conditions || catalogue.scopeFields?.has(name) || !provided(literal[name])) continue;
    for (const [param, values] of Object.entries(conditions)) {
      if (Array.isArray(values) && !values.includes(String(inForce(literal, schema, param) ?? ""))) {
        advise(entry.keyToken, `check "${id}": ${name} applies only when ${param} is ${values.join(", ").replace(/, ([^,]*)$/, " or $1")}.`);
        break;
      }
    }
  }

  return out;
}
