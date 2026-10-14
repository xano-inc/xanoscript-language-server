import { expect } from "chai";
import { readdirSync, readFileSync } from "fs";
import { afterEach, describe, it } from "mocha";
import { join } from "path";
import { xanoscriptParser } from "../../parser.js";
import {
  clearPolicyCatalogue,
  setPolicyCatalogue,
} from "../../policy/catalogue.js";
import snapshot from "../../policy/catalogueSnapshot.js";

// Example policies (valid_sources/*.xs), one per scenario (authentication, logging, vendor calls,
// retention, …), covering most of the catalogue's checks. Each must parse clean; each seeded typo
// below must be flagged.
const DIR = "parser/tests/policy/valid_sources";
const example = (file) => readFileSync(join(DIR, file), "utf8");

/** Parse and answer each finding as "line:column message". */
function findings(source) {
  const parser = xanoscriptParser(source);
  const at = (token) => {
    const before = source.slice(0, token.startOffset);
    return `${before.split("\n").length}:${token.startOffset - before.lastIndexOf("\n")}`;
  };
  return {
    errors: parser.errors.map((e) => `${at(e.token)} ${e.message}`),
    warnings: parser.warnings.map((w) => `${at(w.token)} ${w.message}`),
  };
}

/** `source` with `from` replaced once; fails the test when `from` is not in it. */
function seed(source, from, to) {
  expect(source, `seed "${from}"`).to.include(from);
  return source.replace(from, to);
}

describe("policy documents (example policies)", () => {
  afterEach(() => clearPolicyCatalogue());

  it("parses every example policy clean with no catalogue loaded", () => {
    for (const file of readdirSync(DIR)) {
      expect(findings(example(file)), file).to.deep.equal({ errors: [], warnings: [] });
    }
  });

  it("parses every example policy clean against a live catalogue", () => {
    setPolicyCatalogue(snapshot, { source: "live" });
    for (const file of readdirSync(DIR)) {
      expect(findings(example(file)), file).to.deep.equal({ errors: [], warnings: [] });
    }
  });

  it("parses every example policy clean against the bundled snapshot", () => {
    setPolicyCatalogue(snapshot, { source: "snapshot" });
    for (const file of readdirSync(DIR)) {
      expect(findings(example(file)), file).to.deep.equal({ errors: [], warnings: [] });
    }
  });

  describe("seeded typos, against a live catalogue", () => {
    const live = () => setPolicyCatalogue(snapshot, { source: "live" });

    it("flags a misspelled check id and names the one meant", () => {
      live();
      const source = seed(example("AUTH-001.xs"), '"object.auth_required"', '"object.auth_requird"');
      expect(findings(source).errors).to.deep.equal([
        '34:13 "object.auth_requird" is not a policy check. Did you mean "object.auth_required"?',
      ]);
    });

    it("flags a same-length misspelling of a check id", () => {
      live();
      const source = seed(example("AUTH-001.xs"), '"object.auth_required"', '"object.auth_requirex"');
      expect(findings(source).errors).to.have.length(1);
      expect(findings(source).errors[0]).to.include('"object.auth_requirex" is not a policy check');
    });

    it("flags a misspelled param and names the one meant", () => {
      live();
      const source = seed(example("AUTH-001.xs"), "params = { except_tags:", "params = { except_tag:");
      const { errors } = findings(source);
      expect(errors).to.have.length(1);
      // The accepted list is the catalogue's, whatever it holds today.
      expect(errors[0]).to.match(/^35:16 unknown param "except_tag" for check "object\.auth_required"\. Did you mean "except_tags"\? Accepted params: .*except_tags.*\.$/);
    });

    it("flags a value outside a param's closed set", () => {
      live();
      const source = seed(example("LOG-001.xs"), 'object_kind: "middleware"', 'object_kind: "middlewar"');
      const [error] = findings(source).errors;
      expect(error).to.match(/^\d+:\d+ param "object_kind" of check "object\.settings_forbidden" must be one of: table, query, /);
    });

    it("flags a list item outside a list param's closed set", () => {
      live();
      const source = seed(example("VND-001.xs"), 'kinds: ["http", "cloud", "email"]', 'kinds: ["http", "clod", "email"]');
      const [error] = findings(source).errors;
      expect(error).to.match(/param "kinds" of check "outbound\.vendor_allowlist" must contain only: /);
    });

    it("flags a param of the wrong type", () => {
      live();
      const source = seed(example("SEC-001.xs"), "max: 3600,", 'max: "3600",');
      expect(findings(source).errors[0]).to.match(/param "max" of check "statement\.param_bound" must be a finite number\.$/);
    });

    it("flags a misspelled field of an object param", () => {
      live();
      const source = seed(example("BIZ-001.xs"), "before: { statements:", "before: { statment:");
      expect(findings(source).errors).to.deep.equal([
        '20:26 check "stack.statement_order": Unknown before field: statment',
      ]);
      // "before" then has neither statements nor functions: advisory, as it mirrors platform logic.
      expect(findings(source).warnings).to.deep.equal([
        '20:16 check "stack.statement_order": before requires before.statements or before.functions.',
      ]);
    });

    it("flags a missing required param", () => {
      live();
      const source = seed(example("RET-001.xs"), 'params = { object_kind: "table", names: ["access_log"] }', 'params = { names: ["access_log"] }');
      expect(findings(source).errors[0]).to.match(/check "workspace\.object_required" requires param "object_kind"\.$/);
    });

    it("flags a misspelled policy field and names the one meant", () => {
      live();
      const source = seed(example("CHG-002.xs"), "  statement = ", "  statment = ");
      expect(findings(source).errors[0]).to.match(/^3:3 policy: unknown field "statment"\. Did you mean "statement"\? Policy fields: /);
    });

    it("flags a severity outside its value set", () => {
      live();
      const source = seed(example("CONF-001.xs"), 'severity = "critical"', 'severity = "urgent"');
      expect(findings(source).errors).to.deep.equal([
        '5:14 severity must be one of: critical, high, medium, low (got "urgent").',
      ]);
    });

    it("flags a severity written on a rule", () => {
      live();
      const source = seed(example("VAL-001.xs"), '    check = "db.write_from_input_forbidden"', '    severity = "high"\n    check = "db.write_from_input_forbidden"');
      expect(findings(source).errors[0]).to.match(/rule\[0\]: "severity" is set on the policy, not on a rule\.$/);
    });

    it("flags a comment inside the policy block", () => {
      live();
      const own = seed(example("AUTH-001.xs"), "  rule {", "  // why\n  rule {");
      expect(findings(own).errors[0]).to.match(/^(\d+):3 line \1: policy files cannot contain "\/\/" comments\./);
      const trailing = seed(example("AUTH-001.xs"), 'severity = "critical"', 'severity = "critical" // or high');
      expect(findings(trailing).errors[0]).to.match(/^(\d+):25 line \1: policy files cannot contain "\/\/" comments\./);
    });

    it("flags a named rule and a reserved block", () => {
      live();
      const named = seed(example("AUTH-001.xs"), "  rule {", "  rule public_ok {");
      expect(findings(named).errors[0]).to.match(/:8 rule\[0\]: A rule cannot be named\./);
      const guard = seed(example("AUTH-001.xs"), "  rule {", "  guard {\n  }\n  rule {");
      expect(findings(guard).errors[0]).to.match(/Policy block "guard" is reserved\./);
    });
  });

  describe("seeded typos, against the bundled snapshot", () => {
    it("says a check-level problem as a warning, dated", () => {
      setPolicyCatalogue(snapshot, { source: "snapshot" });
      const source = seed(example("AUTH-001.xs"), '"object.auth_required"', '"object.auth_requird"');
      const { errors, warnings } = findings(source);
      expect(errors).to.be.empty;
      expect(warnings).to.deep.equal([
        `34:13 "object.auth_requird" is not a policy check. Did you mean "object.auth_required"? (checked against the language server's check catalogue of ${snapshot.generated_at}; your instance decides on save)`,
      ]);
    });

    it("says a document problem as a warning too, and a structural one as an error", () => {
      setPolicyCatalogue(snapshot, { source: "snapshot" });
      const severity = seed(example("CONF-001.xs"), 'severity = "critical"', 'severity = "urgent"');
      expect(findings(severity).errors).to.be.empty;
      expect(findings(severity).warnings[0]).to.match(/^5:14 severity must be one of: critical, high, medium, low \(got "urgent"\)\. \(checked against/);
      const comment = seed(example("CONF-001.xs"), "  rule {", "  // why\n  rule {");
      expect(findings(comment).errors[0]).to.match(/^(\d+):3 line \1: policy files cannot contain "\/\/" comments\./);
    });
  });
});
