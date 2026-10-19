/**
 * Markdown for a check and for one of its params, rendered from the catalogue entry as served.
 * Nothing is written here that the catalogue does not say.
 */

const code = (value) => "`" + (value === "" ? '""' : value) + "`";

/** The value set a param (or its list items) is closed to, if any. */
export function paramValues(spec) {
  return spec?.values ?? spec?.items?.values ?? null;
}

/** One line under a check: `name` (type, required). */
function paramLine(name, spec) {
  const flags = [spec?.type ?? "string"];
  if (spec?.required) flags.push("required");
  return `- ${code(name)} (${flags.join(", ")})`;
}

/**
 * @param {Object} check a catalogue item
 * @param {{scopeFields?: Set<string>}} [catalogue] leaves the shared scope fields out of the list
 */
export function checkMarkdown(check, catalogue) {
  const lines = [`**${check.label || check.id}**`, "", code(check.id)];
  if (check.description) lines.push("", check.description);
  const facts = [];
  if (check.category) facts.push(`Category: ${check.category}`);
  if (check.object_kinds?.length) {
    facts.push(`Inspects: ${check.object_kinds.join(", ")}`);
  }
  if (facts.length) lines.push("", facts.join(" · "));

  const scope = catalogue?.scopeFields ?? new Set();
  const own = Object.entries(check.params ?? {}).filter(([name]) => !scope.has(name));
  if (own.length) {
    lines.push("", "Params:", ...own.map(([name, spec]) => paramLine(name, spec)));
  }
  if (check.requires_one_of?.length) {
    lines.push("", `Set at least one of ${check.requires_one_of.map(code).join(", ")}.`);
  }
  const applicable = (check.scope_fields ?? []).map((field) => field.name);
  if (applicable.length) {
    lines.push("", `Scope fields: ${applicable.map(code).join(", ")}.`);
  }
  const uses = useLines(check.uses);
  if (uses.length) lines.push("", "Uses:", ...uses);
  if (check.fix_hint) lines.push("", `Fix: ${check.fix_hint}`);
  return lines.join("\n");
}

/**
 * A check's `uses` as a list: each goal, then the `params = { ... }` line that achieves it, written
 * as a rule writes it, then its note when it has one.
 */
function useLines(uses) {
  if (!Array.isArray(uses)) return [];
  return uses
    .filter((use) => typeof use?.goal === "string" && use.goal !== "")
    .flatMap((use) => [
      `- ${use.goal}`,
      `  ${code(`params = ${policyValue(Array.isArray(use.params) ? {} : (use.params ?? {}))}`)}`,
      ...(typeof use.note === "string" && use.note !== "" ? [`  ${use.note}`] : []),
    ]);
}

/** A value as a policy file writes it: `{ key: value }` with bare keys, JSON strings and lists. */
function policyValue(value) {
  if (Array.isArray(value)) return `[${value.map(policyValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    const key = (name) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : JSON.stringify(name));
    return `{ ${entries.map(([name, item]) => `${key(name)}: ${policyValue(item)}`).join(", ")} }`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * @param {string} checkId
 * @param {string} path the param name, or `name.field` for a field of an object param
 * @param {Object} spec its catalogue schema
 */
export function paramMarkdown(checkId, path, spec) {
  const flags = [spec?.type ?? "string"];
  if (spec?.required) flags.push("required");
  const lines = [`**${path}** (${flags.join(", ")}) · ${code(checkId)}`];
  if (spec?.description) lines.push("", spec.description);
  const values = paramValues(spec);
  if (values?.length) lines.push("", `One of: ${values.map(code).join(", ")}.`);
  if (spec?.properties) {
    lines.push("", `Fields: ${Object.keys(spec.properties).map(code).join(", ")}.`);
  }
  if (spec?.requires_one_of?.length) {
    lines.push("", `Set at least one of ${spec.requires_one_of.map(code).join(", ")}.`);
  }
  if (spec?.minimum !== undefined) lines.push("", `At least ${spec.minimum}.`);
  if (spec && "default" in spec) {
    lines.push("", `Default: ${code(JSON.stringify(spec.default))}`);
  }
  if (spec && "example" in spec) {
    lines.push("", `Example: ${code(JSON.stringify(spec.example))}`);
  }
  return lines.join("\n");
}
