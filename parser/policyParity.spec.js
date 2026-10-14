import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import { documentCache } from "../cache/documentCache.js";
import { multidocParser, splitMultidoc } from "./multidoc.js";
import { xanoscriptParser } from "./parser.js";
import { clearPolicyCatalogue, setPolicyCatalogue } from "./policy/catalogue.js";
import snapshot from "./policy/catalogueSnapshot.js";

const rule = '  rule {\n    check = "object.auth_required"\n  }\n';
const policy = (fields = "", rules = rule, key = "K") => `policy ${key} {\n${fields}${rules}}`;
const withParams = (params, check = "object.auth_required") =>
  policy("", `  rule {\n    check = "${check}"\n    params = ${params}\n  }\n`);
const errors = (source) => xanoscriptParser(source).errors.map((e) => e.message);

// These cases were compared with the native policy/parse API, not inferred from this parser.
describe("policy native parser parity", () => {
  beforeEach(() => setPolicyCatalogue(snapshot, { source: "live" }));
  afterEach(() => { clearPolicyCatalogue(); documentCache.clear(); });

  it("accepts blank lines and comments outside the policy", () => {
    expect(errors(`\n// heading\n\n${policy()}\n// ending\n`)).to.deep.equal([]);
    expect(errors(policy("  // inside\n"))[0]).to.include('cannot contain "//"');
  });

  it("accepts compact blocks (fields still one per line) and single-quoted or padded keys", () => {
    expect(errors('policy K { title = "a" statement = "b" rule { check = "object.auth_required" } }')[0]).to.include("separated by a newline");
    expect(errors('policy K { rule { check = "object.auth_required" } }')).to.deep.equal([]);
    expect(errors(policy("", rule, "'K-1'"))).to.deep.equal([]);
    expect(errors(policy("", rule, '" K-1 "'))).to.deep.equal([]);
  });

  it("accepts empty list and null params, while still checking required params", () => {
    expect(errors(withParams("[]"))).to.deep.equal([]);
    expect(errors(withParams("null"))).to.deep.equal([]);
    expect(errors(withParams("null", "stack.statement_forbidden"))[0]).to.include('requires param "statements"');
  });

  it("decodes native C escapes rather than JSON unicode escapes", () => {
    expect(errors(policy('  severity = "\\x68igh"\n', rule, '"\\x4b"'))).to.deep.equal([]);
    expect(errors(policy('  severity = "\\u0068igh"\n'))[0]).to.include('got "u0068igh"');
    expect(errors(policy('  severity = "\\150igh"\n'))).to.deep.equal([]);
  });

  it("counts tag length in Unicode characters, as the platform does", () => {
    expect(errors(policy(`  tags = ["${"😀".repeat(64)}"]\n`))).to.deep.equal([]);
    expect(errors(policy(`  tags = ["${"😀".repeat(65)}"]\n`))[0]).to.include("64 characters or fewer");
  });

  it("allows empty optional selectors while refusing nulls and wrong nested types", () => {
    expect(errors(withParams('{ statements: ["db.edit"], when: { statement: null, tables: ["employee"] } }', "object.statement_required"))[0]).to.include('"when.statement"');
    expect(errors(withParams('{ statements: ["db.edit"], when: { statement: [] } }', "object.statement_required"))[0]).to.include('"when.statement"');
    expect(errors(withParams('{ statements: ["db.edit"], when: { tables: [] } }', "object.statement_required"))).to.deep.equal([]);
  });

  it("refuses filtered objects and arrays as non-literals", () => {
    expect(errors(withParams('{}|set:"tags":["x"]'))).to.include("Policy parameters must be literal values.");
    expect(errors(withParams('{ tags: ["x"]|append:"y" }'))).to.include("Policy parameters must be literal values.");
  });

  it("reports characters skipped by lexical recovery at their actual offsets", () => {
    const source = policy('  title = "ok"§\n');
    const parser = xanoscriptParser(source);
    expect(parser.errors).to.have.length(1);
    expect(parser.errors[0].token.startOffset).to.equal(source.indexOf("§"));
    expect(errors(policy('  title = "ok";\n'))).to.have.length(1);
  });

  it("reports `#` as one syntax error in the platform's words, at the `#`", () => {
    const source = policy("  # why\n");
    const parser = xanoscriptParser(source);
    expect(parser.errors.map((e) => e.message)).to.deep.equal(["Syntax error: unexpected '#'"]);
    expect(parser.errors[0].token.startOffset).to.equal(source.indexOf("#"));
    expect(errors(policy('  title = "a" ## why\n'))).to.deep.equal(["Syntax error: unexpected '#'"]);
  });

  it("treats inherited JavaScript names as unknown fields without crashing", () => {
    expect(errors(policy('  constructor = "x"\n'))[0]).to.include('unknown field "constructor"');
    expect(errors(withParams('{ constructor: "x" }'))[0]).to.include('unknown param "constructor"');
    expect(errors(withParams('{ statements: ["db.edit"], when: { constructor: "x" } }', "object.statement_required"))[0]).to.include("Unknown when field: constructor");
  });

  it("keeps a Markdown separator inside a narrative on the editor's cached parse path", () => {
    const source = policy('  narrative = """\nBefore\n---\nAfter\n  """\n');
    const parsed = documentCache.getOrParse("file:///policy.xs", 1, source);
    expect(parsed.scheme).to.equal("policy");
    expect(parsed.parser.errors).to.deep.equal([]);
    expect(parsed.parser.warnings.map((w) => w.token.startOffset)).to.deep.equal([source.indexOf("\n---\n") + 1]);
    expect(multidocParser(`${source}\n---\n${policy()}`).segmentCount).to.equal(2);
  });

  // The platform's multidoc splitter (xano workspace push, release push) ends a document at such a
  // line, strings included; its single-document parse keeps it. Canonical source indents it.
  it("warns on an unindented `---` line inside a triple-quoted string, where a multidoc push splits", () => {
    const warnings = (source) => xanoscriptParser(source).warnings.filter((w) => w.message.includes('only "---" separates documents'));
    const source = policy('  narrative = """\n  Before\n---  \n  After\n  """\n');
    const [warning, ...more] = warnings(source);
    expect(more).to.deep.equal([]);
    expect(errors(source)).to.deep.equal([]);
    expect(warning.message).to.equal('A line that is only "---" separates documents in a multidoc push (xano workspace push, release push), even inside a string. Indent it to keep it in the text.');
    expect(warning.token.startOffset).to.equal(source.indexOf("\n---") + 1);
    expect(warning.token.startLine).to.equal(4);

    // Canonical (indented) prose and a longer rule are not separators; CRLF ones are.
    expect(warnings(policy('  narrative = """\n  Before\n  ---\n  After\n  ----\n  """\n'))).to.deep.equal([]);
    expect(warnings(policy('  narrative = """\nBefore\n----\n  """\n'))).to.deep.equal([]);
    expect(warnings(policy('  narrative = """\n  Before\n---\n  """\n').replaceAll("\n", "\r\n"))).to.have.length(1);

    // In a multidoc the warning lands on the right line of a later document.
    const multidoc = `${policy()}\n---\n${source}`;
    const merged = multidocParser(multidoc);
    expect(merged.segmentCount).to.equal(2);
    expect(merged.warnings.filter((w) => w.message.includes('only "---"')).map((w) => w.token.startOffset))
      .to.deep.equal([multidoc.lastIndexOf("\n---  \n") + 1]);
  });

  it("keeps every document of a multidoc apart while a string is left open", () => {
    const fn = (name, value) => `function ${name} {\n  stack {\n    var $x {\n      value = ${value}\n    }\n  }\n}`;
    expect(splitMultidoc([fn("a", '"one"'), fn("b", '"two"'), fn("c", '"three"')].join("\n---\n"))).to.have.length(3);
    expect(splitMultidoc([fn("a", '"on'), fn("b", '"two"'), fn("c", '"three"')].join("\n---\n"))).to.have.length(3);
    // Policies with triple-quoted narratives, the open quote in the first.
    const withNarrative = (key, title) => policy(`  title = ${title}\n  narrative = """\n    Prose.\n    """\n`, rule, key);
    const open = [withNarrative("A", '"a'), withNarrative("B", '"b"'), withNarrative("C", '"c"'), withNarrative("D", '"d"')];
    expect(splitMultidoc(open.join("\n---\n"))).to.have.length(4);
  });

  it("accepts CRLF multidoc and preserves the later policy's diagnostic position", () => {
    const prefix = `${policy()}\r\n--- \r\n`;
    const source = prefix + policy().replace("object.auth_required", "object.auth_requirex").replaceAll("\n", "\r\n");
    const parsed = documentCache.getOrParse("file:///multidoc.xs", 1, source);
    expect(parsed.scheme).to.equal("multidoc");
    expect(parsed.parser.errors).to.have.length(1);
    expect(parsed.parser.errors[0].token.startOffset).to.equal(source.indexOf('"object.auth_requirex"'));
  });
});
