/**
 * The policy check catalogue the language server validates policies against.
 *
 * The platform owns the catalogue: `GET workspace/{id}/policy/check` (and `xano policy
 * catalogue -o json`) answers `{items: [check...], templates, document}`: each check with its id,
 * label, description and param schemas, and `document`, the policy file's own fields (their types,
 * value sets and defaults, retired fields, reserved blocks, the key pattern). Nothing here writes a
 * check or a field down by hand. The registry starts EMPTY, and an empty registry means the
 * language server checks the policy's block shape only.
 *
 * A host fills it:
 *   - The Xano editor sends its own live answer (`source: "live"`); a check-level problem is then an
 *     error, because the instance refuses the same save.
 *   - The Node server and offline tools load the generated snapshot (`catalogueSnapshot.js`,
 *     `source: "snapshot"`); a check-level problem is then a warning, because the snapshot can
 *     be older than the instance the file is pushed to.
 */

const EMPTY = Object.freeze({
  checks: new Map(),
  ids: [],
  scopeFields: new Set(),
  document: null,
  source: null,
  generatedAt: null,
});

let state = EMPTY;
let version = 0;

/**
 * Replace the catalogue.
 * @param {Object|Object[]|null} catalogue `{items, document}` as the platform serves it, the editor's
 *   `{checks, document}`, or a bare list of checks; null clears it
 * @param {{source?: "live"|"snapshot", generatedAt?: string|null}} [options]
 */
export function setPolicyCatalogue(catalogue, options = {}) {
  const items = Array.isArray(catalogue)
    ? catalogue
    : (catalogue?.items ?? catalogue?.checks ?? []);
  const checks = new Map();
  for (const item of items) {
    if (item && typeof item.id === "string" && item.id !== "") {
      checks.set(item.id, item);
    }
  }
  const document =
    catalogue && !Array.isArray(catalogue) && catalogue.document && typeof catalogue.document === "object"
      ? catalogue.document
      : null;
  version++;
  if (checks.size === 0 && !document) {
    state = EMPTY;
    return;
  }
  // A scope field is any name the catalogue lists in some check's `scope_fields`: the shared
  // params every check carries that choose which objects a rule selects.
  const scopeFields = new Set();
  for (const check of checks.values()) {
    for (const field of check.scope_fields ?? []) {
      if (field?.name) scopeFields.add(field.name);
    }
  }
  state = Object.freeze({
    checks,
    ids: [...checks.keys()].sort(),
    scopeFields,
    document,
    source: options.source === "snapshot" ? "snapshot" : "live",
    generatedAt: options.generatedAt ?? catalogue?.generated_at ?? null,
  });
}

/** Forget the catalogue: structural checks only. */
export function clearPolicyCatalogue() {
  setPolicyCatalogue(null);
}

/**
 * @returns {{checks: Map<string, Object>, ids: string[], scopeFields: Set<string>,
 *   document: Object|null, source: "live"|"snapshot"|null, generatedAt: string|null}}
 */
export function getPolicyCatalogue() {
  return state;
}

/** Whether a catalogue is loaded. */
export function hasPolicyCatalogue() {
  return state.source !== null;
}

/** One check by id, or null. */
export function getPolicyCheck(id) {
  return state.checks.get(id) ?? null;
}

/** Bumped on every change, so a cached parse made against an older catalogue is not reused. */
export function policyCatalogueVersion() {
  return version;
}
