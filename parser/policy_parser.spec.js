import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { multidocParser } from "./multidoc.js";
import { xanoscriptParser } from "./parser.js";
import { clearPolicyCatalogue, setPolicyCatalogue } from "./policy/catalogue.js";
import snapshot from "./policy/catalogueSnapshot.js";

const messages = (source) => {
  const parser = xanoscriptParser(source);
  return {
    errors: parser.errors.map((e) => e.message),
    warnings: parser.warnings.map((w) => w.message),
  };
};

const RULE = `  rule {\n    check = "object.auth_required"\n  }\n`;

/** The platform's catalogue, served live: its items and its `document`. */
const live = (document = snapshot.document) =>
  setPolicyCatalogue({ items: snapshot.items, document }, { source: "live" });

describe("policy_parser", () => {
  afterEach(() => clearPolicyCatalogue());

  it("reads a policy's scheme from its first word", () => {
    const parser = xanoscriptParser(`// formatting before the block\npolicy K-1 {\n${RULE}}`);
    expect(parser.errors).to.be.empty;
  });

  describe("with no catalogue", () => {
    it("checks the block's shape only: it knows no field and no check", () => {
      const source = `policy K {\n  colour = "red"\n  rule {\n    anything = 1\n    check = "no.such_check"\n  }\n}`;
      expect(messages(source)).to.deep.equal({ errors: [], warnings: [] });
      expect(messages(`policy K {\n  title = "no rule"\n}`).errors).to.be.empty;
    });

    it("still refuses what the shape decides: comments, named rules, other blocks, non-literals", () => {
      const source = `policy K {\n  // why\n  title = $input.x\n  rule named {\n    check = "x"\n    params = { a: $env.b }\n  }\n  guard {\n  }\n}`;
      expect(messages(source).errors).to.deep.equal([
        `line 2: policy files cannot contain "//" comments. Put the explanation in the policy's statement, rationale or narrative.`,
        "title must be a literal value.",
        'rule[0]: A rule cannot be named. Write "rule {" — rules are identified by position (KEY.R1, KEY.R2…).',
        "Policy parameters must be literal values.",
        'policy: unknown block "guard". Policies support rule blocks only.',
      ]);
    });

    it("refuses a key written with spaces in it", () => {
      expect(messages(`policy AUTH 001 {\n${RULE}}`).errors).to.deep.equal([
        'Policy key "AUTH…001" must be written without spaces.',
      ]);
    });

    it("quotes a character it cannot read as the platform's syntax error does (escapeshellarg)", () => {
      expect(messages(`policy K {\n  title = "a" \\\n${RULE}}`).errors).to.deep.equal(["Syntax error: unexpected '\\'"]);
      expect(messages(`policy K {\n  title = "a" '\n${RULE}}`).errors).to.deep.equal(["Syntax error: unexpected ''\\'''"]);
    });
  });

  describe("the key, against the catalogue's pattern", () => {
    for (const key of ["AUTH-001", "sec.v2_x-3", "2FA-001", '"A-1"', "k"]) {
      it(`accepts ${key}`, () => {
        live();
        expect(messages(`policy ${key} {\n${RULE}}`).errors).to.be.empty;
      });
    }

    it("refuses a key the platform refuses", () => {
      live();
      expect(messages(`policy "bad key!" {\n${RULE}}`).errors).to.deep.equal([
        'Policy key "bad key!" must be 1-64 chars of letters, digits, ".", "_" or "-", starting alphanumeric.',
      ]);
      expect(messages(`policy AUTH 001 {\n${RULE}}`).errors[0]).to.match(/^Policy key "AUTH…001" must be 1-64 chars/);
      expect(messages(`policy "${"k".repeat(65)}" {\n${RULE}}`).errors).to.have.length(1);
    });

    it("names the key as written, with no replacement pattern read from it", () => {
      live();
      expect(messages(`policy "a$&b" {\n${RULE}}`).errors[0]).to.match(/^Policy key "a\$&b" must be 1-64 chars/);
    });
  });

  describe("the block, against the catalogue's document", () => {
    it("allows blank lines anywhere", () => {
      live();
      const source = `policy K {\n\n  title = "t"\n\n\n  rule {\n\n    check = "object.auth_required"\n\n\n  }\n\n\n}\n\n`;
      expect(messages(source).errors).to.be.empty;
    });

    it("reads a narrative written as a triple-quoted string", () => {
      live();
      const source = `policy K {\n  narrative = """\n  ## How\n\n  Text.\n  """\n${RULE}}`;
      expect(messages(source).errors).to.be.empty;
    });

    it("needs a rule unless the document's field values allow none", () => {
      live();
      expect(messages(`policy K {\n  title = "t"\n}`).errors).to.deep.equal([
        "An active policy needs at least one rule; set active = false instead.",
      ]);
      expect(messages(`policy K {\n  active = true\n}`).errors).to.have.length(1);
      expect(messages(`policy K {\n  active = false\n}`).errors).to.be.empty;
    });

    it("checks each field's type and closed values", () => {
      live();
      const source = `policy K {\n  title = 3\n  severity = "urgent"\n  active = "live"\n  enforcement = "strict"\n  tags = "soc2"\n${RULE}}`;
      expect(messages(source).errors).to.deep.equal([
        "title must be a string.",
        'severity must be one of: critical, high, medium, low (got "urgent").',
        'active must be true or false.',
        'enforcement must be one of: advisory, blocking (got "strict").',
        "tags must be a list of strings.",
      ]);
    });

    it("refuses the retired enforcement value mandatory, which is now blocking", () => {
      live();
      const enforcement = (value) => messages(`policy K {\n  active = true\n  enforcement = "${value}"\n${RULE}}`).errors;
      expect(enforcement("mandatory")).to.deep.equal([
        'enforcement must be one of: advisory, blocking (got "mandatory").',
      ]);
      expect(enforcement("blocking")).to.be.empty;
    });

    it("refuses an unknown, repeated or retired field", () => {
      live();
      const source = `policy K {\n  colour = "red"\n  title = "a"\n  title = "b"\n  owner = "me"\n  remediation = "x"\n${RULE}}`;
      const { errors } = messages(source);
      expect(errors[0]).to.match(/^policy: unknown field "colour"\. Policy fields: title, statement, .*, tags, rule\.$/);
      expect(errors.slice(1)).to.deep.equal([
        'policy: "title" is set more than once.',
        'policy: "owner" was removed; delete the line. Ownership will return as a reference to a workspace member.',
        'policy: "remediation" was removed; put the guidance in the policy statement.',
      ]);
    });

    it("refuses a tag longer than the document allows", () => {
      live();
      const source = `policy K {\n  tags = ["ok", "${"t".repeat(65)}"]\n${RULE}}`;
      expect(messages(source).errors).to.deep.equal(["tags[1] must be 64 characters or fewer."]);
    });

    it("refuses comments inside the block, in the platform's words", () => {
      live();
      expect(messages(`policy K {\n  /* why */\n${RULE}}`).errors[0]).to.match(/^line 2: policy files cannot contain "\/\* \*\/" comments/);
      expect(messages(`policy K {\n  title = "t" // why\n${RULE}}`).errors[0]).to.match(/^line 2: policy files cannot contain "\/\/" comments/);
    });

    it("refuses a comment inside a multi-line params object or list, at the comment", () => {
      live();
      const sentence = (line) =>
        `line ${line}: policy files cannot contain "//" comments. Put the explanation in the policy's statement, rationale or narrative.`;
      const at = (source) => {
        const [error] = xanoscriptParser(source).errors;
        return { message: error.message, line: error.token.startLine, image: error.token.image };
      };
      const params = (body) => `policy K {\n  rule {\n    check = "object.auth_required"\n    params = {\n${body}    }\n  }\n}`;
      // The first line inside the object, and between two entries.
      expect(at(params(`      // why\n      except_tags: ["x"]\n`))).to.deep.equal({ message: sentence(5), line: 5, image: "// why" });
      expect(at(params(`      tags: ["y"]\n      // why\n      except_tags: ["x"]\n`))).to.deep.equal({ message: sentence(6), line: 6, image: "// why" });
      // Trailing the opening brace.
      expect(at(params(`      except_tags: ["x"]\n`).replace("params = {", "params = { // why"))).to.include({ message: sentence(4), line: 4 });
      // A multi-line list: its first line and after an item.
      const list = (body) => `policy K {\n  tags = [\n${body}  ]\n${RULE}}`;
      expect(at(list(`    // why\n    "a"\n`))).to.deep.equal({ message: sentence(3), line: 3, image: "// why" });
      expect(at(list(`    "a"\n    // why\n`))).to.deep.equal({ message: sentence(4), line: 4, image: "// why" });
    });

    it("refuses reserved and unknown blocks", () => {
      live();
      expect(messages(`policy K {\n  test {\n  }\n${RULE}}`).errors).to.deep.equal([
        'Policy block "test" is reserved. Policies support rule blocks only.',
      ]);
      expect(messages(`policy K {\n  guard G1 {\n  }\n${RULE}}`).errors).to.deep.equal([
        'Policy block "guard" is reserved. Policies support rule blocks only.',
      ]);
      expect(messages(`policy K {\n  rules {\n  }\n${RULE}}`).errors[0]).to.match(/^policy: unknown block "rules"\. Did you mean "rule"\?/);
    });

    it("reads the active boolean and retired lifecycle from the platform catalogue", () => {
      live();
      expect(messages(`policy K {\n  active = false\n}`)).to.deep.equal({ errors: [], warnings: [] });
      expect(messages(`policy K {\n  active = true\n}`).errors).to.deep.equal([
        "An active policy needs at least one rule; set active = false instead.",
      ]);
      expect(messages(`policy K {\n  active = "yes"\n${RULE}}`).errors).to.deep.equal(["active must be true or false."]);
      expect(messages(`policy K {\n  lifecycle = "draft"\n}`).errors[0]).to.equal(
        'policy: "lifecycle" was replaced by "active"; write active = true or active = false.'
      );
    });
  });

  describe("a rule", () => {
    it("needs a check", () => {
      live();
      expect(messages(`policy K {\n  rule {\n    title = "t"\n  }\n}`).errors).to.deep.equal([
        'rule[0]: "check" is required. Name a check from the catalogue: check = "<check id>".',
      ]);
    });

    it("cannot be named, whatever form the name takes, and is refused at the name by its index", () => {
      const named = (name) => {
        const parser = xanoscriptParser(`policy K {\n${RULE}  rule ${name} {\n    check = "object.auth_required"\n  }\n}`);
        return parser.errors.map((e) => ({ message: e.message, image: e.token.image, line: e.token.startLine }));
      };
      const refused = (image) => [{
        message: 'rule[1]: A rule cannot be named. Write "rule {" — rules are identified by position (KEY.R1, KEY.R2…).',
        image,
        line: 5,
      }];
      expect(named("foo")).to.deep.equal(refused("foo"));
      expect(named("1")).to.deep.equal(refused("1"));
      expect(named("'x'")).to.deep.equal(refused("'x'"));
      expect(named('"x"')).to.deep.equal(refused('"x"'));
      expect(named("a.b")).to.deep.equal(refused("a"));
    });

    it("refuses unknown and retired fields, counting rules from 0", () => {
      live();
      const source = `policy K {\n${RULE}  rule {\n    check = "object.auth_required"\n    chek = "x"\n    remediation = "y"\n    severity = "high"\n  }\n}`;
      const { errors } = messages(source);
      expect(errors[0]).to.match(/^rule\[1\]: unknown field "chek"\. Did you mean "check"\? Rule fields: title, check, params\.$/);
      expect(errors.slice(1)).to.deep.equal([
        'rule[1]: "remediation" was removed; put the guidance in the policy statement.',
        'rule[1]: "severity" is set on the policy, not on a rule.',
      ]);
    });

    it("needs params to be an object of literal values", () => {
      live();
      const source = `policy K {\n  rule {\n    check = "object.auth_required"\n    params = { tags: $input.tags, verbs: ["GET"] }\n  }\n  rule {\n    check = "object.auth_required"\n    params = "tags"\n  }\n}`;
      expect(messages(source).errors).to.deep.equal([
        "Policy parameters must be literal values.",
        'params must be an object, e.g. params = { tags: ["pci"] }.',
      ]);
    });

    it("is checked against the catalogue's checks", () => {
      live();
      const source = `policy K {\n  rule {\n    check = "no.such_check"\n  }\n}`;
      expect(messages(source).errors).to.deep.equal(['"no.such_check" is not a policy check.']);
    });
  });

  it("parses a policy inside a multidoc", () => {
    live();
    const clean = multidocParser(`policy A {\n${RULE}}\n---\npolicy B {\n${RULE}}`);
    expect(clean.errors).to.be.empty;
    const typo = multidocParser(`policy A {\n${RULE}}\n---\npolicy B {\n  rule {\n    check = "object.auth_requird"\n  }\n}`);
    expect(typo.errors.map((e) => e.message)).to.deep.equal([
      '"object.auth_requird" is not a policy check. Did you mean "object.auth_required"?',
    ]);
  });
});
