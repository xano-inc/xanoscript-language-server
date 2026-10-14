import { expect } from "chai";
import { afterEach, beforeEach, describe, it } from "mocha";
import { TextDocument } from "vscode-languageserver-textdocument";
import { clearPolicyCatalogue, setPolicyCatalogue } from "../parser/policy/catalogue.js";
import snapshot from "../parser/policy/catalogueSnapshot.js";
import { workspaceIndex } from "../workspace/workspaceIndex.js";
import { getContentAssistSuggestions } from "./contentAssist.js";
import { onCompletion } from "./onCompletion.js";

const CATALOGUE = {
  // The policy's own fields, as the platform publishes them.
  document: snapshot.document,
  items: [
    {
      id: "object.auth_required",
      label: "Endpoints require authentication",
      description: "Requires each endpoint to declare auth.",
      scope_fields: [{ name: "tags" }, { name: "except_tags" }],
      params: {
        except_tags: { type: "string[]", description: "Exclude objects with any listed tag." },
        tags: { type: "string[]", description: "Only objects with a listed tag." },
        verbs: { type: "string[]", description: "Endpoints with these verbs." },
      },
    },
    {
      id: "object.settings_forbidden",
      label: "A setting is forbidden",
      // verbs is a scope field because some check lists it.
      scope_fields: [{ name: "verbs" }],
      params: {
        object_kind: { type: "string", required: true, values: ["query", "middleware"] },
        kinds: { type: "string[]", items: { type: "string", values: ["http", "email"] } },
        when: { type: "object", properties: { active: { type: "bool" }, mode: { type: "string", values: ["a", "b"] } } },
      },
    },
  ],
};

const complete = (prefix) => getContentAssistSuggestions(prefix, "policy");
const labels = (prefix) => complete(prefix).map((item) => item.label);
const RULE = (check) => `policy K {\n  rule {\n    check = "${check}"\n    params = `;
/** Completion at the end of `text`, as a document at `uri` (one uri per text: the cache keys on it). */
const completeAt = (text, uri) => {
  const document = TextDocument.create(uri, "xanoscript", 1, text);
  return onCompletion({ textDocument: { uri }, position: document.positionAt(text.length) }, { get: () => document }) ?? [];
};

describe("policy completion", () => {
  beforeEach(() => setPolicyCatalogue(CATALOGUE));
  afterEach(() => clearPolicyCatalogue());

  it("offers the policy's fields and rule, leaving out those already set", () => {
    expect(labels(`policy K {\n  title = "t"\n  `)).to.deep.equal([
      "statement",
      "rationale",
      "narrative",
      "severity",
      "active",
      "enforcement",
      "tags",
      "rule",
    ]);
  });

  it("offers a rule's fields", () => {
    expect(labels(`policy K {\n  rule {\n    check = "x"\n    `)).to.deep.equal(["title", "params"]);
  });

  it("offers the policy's value sets, quoted when no quote was typed", () => {
    expect(labels(`policy K {\n  severity = "`)).to.deep.equal(["critical", "high", "medium", "low"]);
    const [item] = complete(`policy K {\n  active = `);
    expect(item.textEdit.newText).to.equal('true');
  });

  it("offers every check id from the catalogue, replacing what was typed, dots and all", () => {
    const prefix = `policy K {\n  rule {\n    check = "object.au`;
    const items = complete(prefix);
    expect(items.map((item) => item.label)).to.deep.equal(["object.auth_required", "object.settings_forbidden"]);
    expect(items[0]).to.include({ detail: "Endpoints require authentication" });
    expect(items[0].documentation.value).to.include("Requires each endpoint to declare auth.");
    expect(items[0].textEdit).to.deep.equal({
      range: { start: { line: 2, character: 13 }, end: { line: 2, character: 22 } },
      newText: "object.auth_required",
    });
  });

  it("offers the check's params that apply and are not set yet", () => {
    // verbs is a scope field this check does not list in scope_fields.
    expect(labels(`${RULE("object.auth_required")}{ tags: ["a"], `)).to.deep.equal(["except_tags"]);
    const [param] = complete(`${RULE("object.auth_required")}{ `);
    expect(param.documentation.value).to.include("Exclude objects with any listed tag.");
  });

  it("offers a param's closed values, a list param's item values and an object param's fields", () => {
    expect(labels(`${RULE("object.settings_forbidden")}{ object_kind: "`)).to.deep.equal(["query", "middleware"]);
    expect(labels(`${RULE("object.settings_forbidden")}{ kinds: ["http", "`)).to.deep.equal(["http", "email"]);
    expect(labels(`${RULE("object.settings_forbidden")}{\n      when: {\n        `)).to.deep.equal(["active", "mode"]);
    expect(labels(`${RULE("object.settings_forbidden")}{ when: { mode: "`)).to.deep.equal(["a", "b"]);
  });

  it("offers true and false for a bool field, unquoted", () => {
    setPolicyCatalogue({ ...CATALOGUE, document: { fields: { active: { type: "bool", default: true } } } });
    const items = complete(`policy K {\n  active = `);
    expect(items.map((item) => item.textEdit.newText)).to.deep.equal(["true", "false"]);
    expect(labels(`policy K {\n  active = "`)).to.deep.equal([]);
  });

  it("offers boolean params without quotes and supports compact rule headers", () => {
    const items = complete(`${RULE("object.settings_forbidden")}{ when: { active: `);
    expect(items.map((item) => item.textEdit.newText)).to.deep.equal(["true", "false"]);
    expect(labels(`${RULE("object.settings_forbidden")}{ when: { active: "`)).to.deep.equal([]);
    expect(labels('policy K { rule { check = "object.au')).to.include("object.auth_required");
    expect(labels('policy rule {\n ')).to.include("title");
  });

  it("does not suggest inside single-triple-quoted prose or from inherited properties", () => {
    expect(labels("policy K {\n narrative = '''\nrule {\ncheck = \"")).to.deep.equal([]);
    expect(labels('policy K {\n constructor = ')).to.deep.equal([]);
    expect(labels(`${RULE("object.settings_forbidden")}{ constructor: `)).to.deep.equal([]);
  });

  it("puts a textEdit in document coordinates inside a multidoc", () => {
    const text = `table t {\n  schema {\n    int id\n  }\n}\n---\npolicy K {\n  rule {\n    check = "object.au`;
    const uri = "file:///multidoc.xs";
    const document = TextDocument.create(uri, "xanoscript", 1, text);
    const items = onCompletion(
      { textDocument: { uri }, position: document.positionAt(text.length) },
      { get: () => document }
    );
    const item = items.find((entry) => entry.label === "object.auth_required");
    expect(item.textEdit.range).to.deep.equal({
      start: { line: 8, character: 13 },
      end: { line: 8, character: 22 },
    });
  });

  it("offers nothing from the catalogue outside a policy, or when none is loaded", () => {
    // Routed by the document's own first word: the same position offers a policy's fields only in a policy.
    expect(completeAt(`policy K {\n  `, "file:///policy.xs").map((item) => item.label)).to.include("rule");
    expect(completeAt(`function f {\n  `, "file:///function.xs").map((item) => item.label)).to.not.include("rule");
    clearPolicyCatalogue();
    expect(labels(`policy K {\n  rule {\n    check = "`)).to.deep.equal([]);
  });

  it("offers no workspace table, function, task or query names inside a policy", () => {
    workspaceIndex.addFile("file:///employee.xs", "table employee {\n  schema {\n    int id\n  }\n}");
    try {
      const prose = completeAt(`policy K {\n  statement = "Only admins can delete `, "file:///prose.xs");
      expect(prose.map((item) => item.label)).to.not.include("employee");
      // The same words in a function's stack still name a table.
      const stack = completeAt(`function f {\n  stack {\n    db.delete `, "file:///stack.xs");
      expect(stack.map((item) => item.label)).to.include("employee");
    } finally {
      workspaceIndex.removeFile("file:///employee.xs");
    }
  });
});
