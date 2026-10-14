import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import { lexDocument } from "../lexer/lexer.js";
import { clearPolicyCatalogue, setPolicyCatalogue } from "../parser/policy/catalogue.js";
import { PolicyMessageProvider } from "./PolicyMessageProvider.js";

const CATALOGUE = {
  items: [
    {
      id: "stack.statement_order",
      label: "A statement comes before another",
      description: "Requires every matching after statement to be preceded by a before.",
      category: "logic",
      object_kinds: ["query"],
      scope_fields: [{ name: "tags" }],
      params: {
        before: {
          type: "object",
          required: true,
          description: "Guard required ahead of each after match.",
          properties: { statements: { type: "string[]", description: "Statements that qualify." } },
        },
        after: { type: "string[]", required: true, description: "Statement names that must follow before." },
        tags: { type: "string[]", description: "Only objects with a listed tag." },
      },
      uses: [
        {
          goal: "Records are deleted only after an approval check.",
          params: { before: { functions: ["require_approval"] }, after: ["db.del"] },
          note: "It confirms the call comes first, not what the function decides.",
        },
        { goal: "Nothing to set.", params: [] },
      ],
    },
  ],
};

const SOURCE = `policy K {
  rule {
    params = { before: { statements: ["precondition"] }, after: ["db.add"] }
    check = "stack.statement_order"
  }
}`;

function hover(word) {
  const tokens = lexDocument(SOURCE).tokens;
  const index = tokens.findIndex((token) => token.image === word);
  const provider = new PolicyMessageProvider();
  return provider.isMatch(index, tokens) ? provider.render(index, tokens) : null;
}

describe("PolicyMessageProvider", () => {
  afterEach(() => clearPolicyCatalogue());

  it("describes a rule's check, from the catalogue", () => {
    setPolicyCatalogue(CATALOGUE);
    const text = hover('"stack.statement_order"');
    expect(text).to.include("**A statement comes before another**");
    expect(text).to.include("Requires every matching after statement");
    expect(text).to.include("- `before` (object, required)");
    // The shared scope fields are listed once, not as the check's own params.
    expect(text).to.not.include("- `tags`");
  });

  it("lists a check's uses: each goal, its params as a rule writes them, and its note", () => {
    setPolicyCatalogue(CATALOGUE);
    const text = hover('"stack.statement_order"');
    expect(text).to.include(
      [
        "Uses:",
        "- Records are deleted only after an approval check.",
        '  `params = { before: { functions: ["require_approval"] }, after: ["db.del"] }`',
        "  It confirms the call comes first, not what the function decides.",
        "- Nothing to set.",
        "  `params = {}`",
      ].join("\n")
    );
  });

  it("describes a param and an object param's field, even when check comes after params", () => {
    setPolicyCatalogue(CATALOGUE);
    expect(hover("after")).to.include("**after** (string[], required)");
    expect(hover("statements")).to.include("**before.statements** (string[])");
  });

  it("describes a policy or rule field, from the catalogue's document", () => {
    setPolicyCatalogue({
      ...CATALOGUE,
      document: {
        fields: { severity: { type: "string", values: ["high", "low"], default: "low", description: "How much it matters." } },
        rule: { check: { type: "string", required: true, description: "The check the rule runs." } },
      },
    });
    const tokens = lexDocument(`policy K {\n  severity = "high"\n  rule {\n    check = "x"\n  }\n}`).tokens;
    const provider = new PolicyMessageProvider();
    const at = (word) => tokens.findIndex((token) => token.image === word);
    expect(provider.render(at("severity"), tokens)).to.equal(
      "**severity** (string)\n\nHow much it matters.\n\nOne of: `high`, `low`.\n\nDefault: `low`"
    );
    expect(provider.render(at("check"), tokens)).to.include("**check** (string, required)");
  });

  it("says nothing without a catalogue, or outside a policy", () => {
    expect(hover("after")).to.equal(null);
    setPolicyCatalogue(CATALOGUE);
    const tokens = lexDocument(`function f {\n  input {\n    text after\n  }\n}`).tokens;
    expect(new PolicyMessageProvider().isMatch(tokens.findIndex((t) => t.image === "after"), tokens)).to.equal(false);
  });

  it("describes a single-quoted check inside a compact rule", () => {
    setPolicyCatalogue(CATALOGUE);
    const tokens = lexDocument("policy K { rule { check = ' stack.statement_order ' } }").tokens;
    const index = tokens.findIndex((token) => token.image.startsWith("'"));
    expect(new PolicyMessageProvider().render(index, tokens)).to.include("**A statement comes before another**");
  });

  it("never describes inherited JavaScript properties as catalogue fields", () => {
    setPolicyCatalogue({ ...CATALOGUE, document: { fields: {} } });
    const tokens = lexDocument('policy K {\n constructor = "x"\n rule {\n check = "stack.statement_order"\n params = { before: { constructor: "x" } }\n }\n}').tokens;
    const provider = new PolicyMessageProvider();
    tokens.forEach((token, index) => {
      if (token.image === "constructor") expect(provider.isMatch(index, tokens)).to.equal(false);
    });
  });
});
