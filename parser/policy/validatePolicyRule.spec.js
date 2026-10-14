import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { xanoscriptParser } from "../parser.js";
import { clearPolicyCatalogue, getPolicyCatalogue, setPolicyCatalogue } from "./catalogue.js";
import { nearestNames } from "./validatePolicyRule.js";

// A made-up catalogue in the platform's shape: every param type and constraint the validator
// reads, so these tests do not move when the real catalogue does.
const CATALOGUE = {
  items: [
    {
      id: "test.every_type",
      requires_one_of: ["label", "flag"],
      scope_fields: [{ name: "tags" }, { name: "verbs", applies_when: { kind: ["query"] } }, { name: "tables", applies_when: { names: "non_empty" } }],
      params: {
        kind: { type: "string", required: true, values: ["query", "table"] },
        mode: { type: "string", values: ["", "strict"] },
        label: { type: "string" },
        flag: { type: "bool", default: false },
        names: { type: "string[]", default: [] },
        colors: { type: "string[]", items: { type: "string", values: ["red", "blue"] } },
        count: { type: "integer", minimum: 1, default: 1 },
        ratio: { type: "number" },
        where: {
          type: "object",
          requires_one_of: ["a", "b"],
          properties: { a: { type: "string" }, b: { type: "string[]" }, c: { type: "bool", required: true } },
        },
        map: { type: "object", properties: { "<name>": { type: "string" } } },
        list: { type: "array" },
        anything: { type: "any" },
        locations: { type: "string[]", non_empty: true, default: ["x"] },
        tags: { type: "string[]", default: [] },
        verbs: { type: "string[]", default: [] },
        tables: { type: "string[]", default: [] },
        query_only: { type: "bool", default: false, applies_when: { kind: ["query"] } },
      },
    },
  ],
};

function check(params) {
  const parser = xanoscriptParser(`policy K {\n  rule {\n    check = "test.every_type"\n    params = ${params}\n  }\n}`);
  return {
    errors: parser.errors.map((e) => e.message),
    warnings: parser.warnings.map((w) => w.message),
  };
}

const MINIMAL = `{ kind: "query", label: "x", where: { a: "y", c: true } }`;

describe("validatePolicyRule", () => {
  afterEach(() => clearPolicyCatalogue());

  it("passes a rule that meets its check's schema", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(check(MINIMAL)).to.deep.equal({ errors: [], warnings: [] });
  });

  it("reads the check's own scope fields and other params from the catalogue", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(getPolicyCatalogue().scopeFields).to.deep.equal(new Set(["tags", "verbs", "tables"]));
  });

  it("says which params are missing", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(check(`{ label: "x", where: { a: "y", c: true } }`).errors).to.deep.equal([
      'check "test.every_type" requires param "kind".',
    ]);
    expect(check(`{ kind: "query", where: { a: "y", c: true } }`).errors).to.deep.equal([
      'check "test.every_type" requires label or flag.',
    ]);
    // A default counts: `flag` defaults to false, which is not set.
    expect(check(`{ kind: "query", flag: true, where: { a: "y", c: true } }`).errors).to.be.empty;
  });

  it("checks each declared type", () => {
    setPolicyCatalogue(CATALOGUE);
    const bad = `{ kind: "query", label: 1, flag: "yes", names: "a", count: 1.5, ratio: "1", where: [1], list: {a: 1}, anything: $x }`;
    expect(check(bad).errors).to.deep.equal([
      "Policy parameters must be literal values.",
      'param "label" of check "test.every_type" must be a string.',
      'param "flag" of check "test.every_type" must be a boolean.',
      'param "names" of check "test.every_type" must be a list of strings.',
      'param "count" of check "test.every_type" must be a whole number of at least 1.',
      'param "ratio" of check "test.every_type" must be a finite number.',
      'param "where" of check "test.every_type" must be an object.',
      'param "list" of check "test.every_type" must be an array.',
    ]);
  });

  it("refuses an integer too large for a double to hold exactly, as the server does", () => {
    setPolicyCatalogue(CATALOGUE);
    const rule = (count) => `{ kind: "query", label: "x", count: ${count}, where: { a: "y", c: true } }`;
    expect(check(rule("9007199254740991")).errors).to.be.empty;
    for (const count of ["9007199254740992", "10000000000000000000"]) {
      expect(check(rule(count)).errors).to.deep.equal([
        'param "count" of check "test.every_type" must be a whole number no larger than 9007199254740991.',
      ]);
    }
  });

  it("checks closed value sets, and says when leaving one out is allowed", () => {
    setPolicyCatalogue(CATALOGUE);
    const bad = `{ kind: "tabel", label: "x", mode: "loose", colors: ["red", "green"], where: { a: "y", c: true } }`;
    expect(check(bad).errors).to.deep.equal([
      'param "kind" of check "test.every_type" must be one of: query, table.',
      'param "mode" of check "test.every_type" must be one of: strict (or omit it).',
      'param "colors" of check "test.every_type" must contain only: red, blue.',
    ]);
  });

  it("checks an object param's fields, unless its keys are the author's own", () => {
    setPolicyCatalogue(CATALOGUE);
    const bad = `{ kind: "query", label: "x", where: { a: "", z: 1 }, map: { anything: "goes" } }`;
    expect(check(bad)).to.deep.equal({
      errors: [
        'check "test.every_type": where.a must not be empty.',
        'check "test.every_type": Unknown where field: z',
        'check "test.every_type": where.c is required.',
      ],
      // An empty string does not count as set.
      warnings: ['check "test.every_type": where requires where.a or where.b.'],
    });
    expect(check(`{ kind: "query", label: "x", where: { c: true } }`).warnings).to.deep.equal([
      'check "test.every_type": where requires where.a or where.b.',
    ]);
  });

  it("refuses an empty value where one is required", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(check(`{ kind: "query", label: "x", locations: [], where: { a: "y", c: true } }`).errors).to.deep.equal([
      'check "test.every_type": locations must not be empty.',
    ]);
  });

  it("warns about a scope field that cannot narrow this rule", () => {
    setPolicyCatalogue(CATALOGUE);
    const scoped = (extra) => check(`{ kind: "table", label: "x", where: { a: "y", c: true }, ${extra} }`).warnings;
    expect(scoped(`tags: ["t"]`)).to.be.empty;
    expect(scoped(`verbs: ["GET"]`)).to.deep.equal([
      '"verbs" applies to check "test.every_type" only when kind is query.',
    ]);
    expect(scoped(`tables: ["t"]`)).to.deep.equal([
      '"tables" applies to check "test.every_type" only when names is set.',
    ]);
    expect(scoped(`tables: ["t"], names: ["n"]`)).to.be.empty;
  });

  it("warns about a param set for a value of the kind param it does not apply to", () => {
    setPolicyCatalogue(CATALOGUE);
    const rule = (kind, extra) => check(`{ kind: "${kind}", label: "x", where: { a: "y", c: true }, ${extra} }`).warnings;
    expect(rule("table", "query_only: true")).to.deep.equal([
      'check "test.every_type": query_only applies only when kind is query.',
    ]);
    expect(rule("query", "query_only: true")).to.be.empty;
    expect(rule("table", "query_only: false")).to.be.empty;
  });

  it("reads a param written as null as its default, as the platform does", () => {
    setPolicyCatalogue({
      items: [
        {
          id: "test.defaults",
          requires_one_of: ["fields", "include_sensitive"],
          scope_fields: [{ name: "tables", applies_when: { mode: ["table"] } }],
          params: {
            fields: { type: "string[]", default: [] },
            include_sensitive: { type: "bool", default: true },
            mode: { type: "string", values: ["table", "query"], default: "table" },
            tables: { type: "string[]", default: [] },
          },
        },
      ],
    });
    const rule = (params) => {
      const parser = xanoscriptParser(`policy K {\n  rule {\n    check = "test.defaults"\n    params = ${params}\n  }\n}`);
      return [...parser.errors, ...parser.warnings].map((e) => e.message);
    };
    // include_sensitive defaults to true, so "fields or include_sensitive" holds.
    expect(rule("{ include_sensitive: null }")).to.be.empty;
    expect(rule("{ include_sensitive: false }")).to.deep.equal(['check "test.defaults" requires fields or include_sensitive.']);
    // mode defaults to "table", where tables applies.
    expect(rule(`{ mode: null, tables: ["t"] }`)).to.be.empty;
    expect(rule(`{ mode: "query", tables: ["t"] }`)).to.deep.equal(['"tables" applies to check "test.defaults" only when mode is table.']);
  });

  it("names the nearest param for a typo", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(check(`{ kind: "query", label: "x", where: { a: "y", c: true }, colours: ["red"] }`).errors).to.deep.equal([
      'unknown param "colours" for check "test.every_type". Did you mean "colors"? Accepted params: kind, mode, label, flag, names, colors, count, ratio, where, map, list, anything, locations, tags, verbs, tables, query_only.',
    ]);
  });

  it("finds near misses the way the platform does", () => {
    const ids = ["object.auth_required", "object.input_rules", "table.tag_required"];
    expect(nearestNames("object.auth_requird", ids)).to.deep.equal(["object.auth_required"]);
    expect(nearestNames("auth_required", ids)).to.deep.equal(["object.auth_required"]);
    expect(nearestNames("zzz", ids)).to.deep.equal([]);
    expect(nearestNames("", ids)).to.deep.equal([]);
  });

  it("suggests nothing for a name longer than 128 bytes, as the platform does", () => {
    const ids = ["object.auth_required"];
    const named = (length) => "object.auth_required" + "x".repeat(length - "object.auth_required".length);
    expect(nearestNames(named(128), ids)).to.deep.equal(["object.auth_required"]);
    expect(nearestNames(named(129), ids)).to.deep.equal([]);
    // Bytes, not characters: 65 two-byte characters are 130 bytes.
    expect(nearestNames("é".repeat(64), ["é".repeat(63)])).to.deep.equal(["é".repeat(63)]);
    expect(nearestNames("é".repeat(65), ["é".repeat(64)])).to.deep.equal([]);

    setPolicyCatalogue(CATALOGUE);
    expect(check(`{ kind: "query", label: "x", where: { a: "y", c: true }, ${"colors".padEnd(129, "s")}: ["red"] }`).errors[0])
      .to.match(/^unknown param "colors+" for check "test\.every_type"\. Accepted params: /);
  });

  it("refuses a string param or list entry over 1024 characters, as the platform does", () => {
    setPolicyCatalogue(CATALOGUE);
    const long = "a".repeat(1025);
    expect(check(`{ kind: "query", label: "${long}", names: ["ok", "${long}"], where: { a: "${long}", c: true } }`).errors).to.deep.equal([
      'param "label" of check "test.every_type" must be at most 1024 characters.',
      'param "names" of check "test.every_type" must list strings of at most 1024 characters.',
      'param "where.a" of check "test.every_type" must be at most 1024 characters.',
    ]);
    // The length is read before the value set, as the platform reads it.
    expect(check(`{ kind: "${long}", label: "x", where: { a: "y", c: true } }`).errors).to.deep.equal([
      'param "kind" of check "test.every_type" must be at most 1024 characters.',
    ]);
    // Characters, not bytes or UTF-16 units: 1024 two-byte or four-byte characters pass.
    expect(check(`{ kind: "query", label: "${"é".repeat(1024)}", names: ["${"😀".repeat(1024)}"], where: { a: "y", c: true } }`).errors).to.be.empty;
    expect(check(`{ kind: "query", label: "${"😀".repeat(1025)}", where: { a: "y", c: true } }`).errors).to.deep.equal([
      'param "label" of check "test.every_type" must be at most 1024 characters.',
    ]);
  });
});
