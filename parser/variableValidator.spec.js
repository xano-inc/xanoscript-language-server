import { expect } from "chai";
import { readFileSync } from "fs";
import { before, describe, it } from "mocha";
import { lexDocument } from "../lexer/lexer.js";
import { xanoscriptParser } from "./parser.js";
import { scanVariableUsages } from "./variableScanner.js";
import { validateVariables } from "./variableValidator.js";

describe("variable tracking - coverage_check.xs", () => {
  let varDeclarations;
  let usages;
  let result;
  let text;

  before(() => {
    text = readFileSync(
      new URL("./tests/variable_test/coverage_check.xs", import.meta.url),
      "utf8",
    );
    const lexResult = lexDocument(text);
    const parser = xanoscriptParser(text);
    expect(parser.errors).to.be.empty;
    varDeclarations = [...parser.__symbolTable.varDeclarations];
    usages = scanVariableUsages(lexResult.tokens, varDeclarations);
    result = validateVariables(parser.__symbolTable, lexResult.tokens);
  });

  function lineOf(offset) {
    return text.substring(0, offset).split("\n").length;
  }

  function declLines(name) {
    return varDeclarations
      .filter((d) => d.name === name)
      .map((d) => lineOf(d.startOffset));
  }

  function usageLines(name) {
    return usages.filter((u) => u.name === name).map((u) => lineOf(u.startOffset));
  }

  // --- Declarations: each variable should be declared exactly once ---

  it("$vehicle declared once at line 26 via 'as $vehicle'", () => {
    expect(declLines("$vehicle")).to.deep.equal([26]);
  });

  it("$unused_variable declared once at line 35 via 'var'", () => {
    expect(declLines("$unused_variable")).to.deep.equal([35]);
  });

  it("$vehicle_response declared once at line 40 via 'var'", () => {
    expect(declLines("$vehicle_response")).to.deep.equal([40]);
  });

  it("$policy declared once at line 63 via 'as $policy'", () => {
    expect(declLines("$policy")).to.deep.equal([63]);
  });

  it("$policy_response declared once at line 66 via 'var' (NOT again at line 87 via var.update)", () => {
    expect(declLines("$policy_response")).to.deep.equal([66]);
  });

  it("$coverages_response declared once at line 70 via 'var'", () => {
    expect(declLines("$coverages_response")).to.deep.equal([70]);
  });

  it("$claims_summary declared once at line 74 via 'var' (NOT again at line 188 via var.update)", () => {
    expect(declLines("$claims_summary")).to.deep.equal([74]);
  });

  it("$policy_coverages declared once at line 105 via 'as'", () => {
    expect(declLines("$policy_coverages")).to.deep.equal([105]);
  });

  it("$pc declared once at line 109 via 'each as $pc'", () => {
    expect(declLines("$pc")).to.deep.equal([109]);
  });

  it("$ctype declared once at line 113 via 'as $ctype'", () => {
    expect(declLines("$ctype")).to.deep.equal([113]);
  });

  it("$coverage_item declared once at line 116 via 'var'", () => {
    expect(declLines("$coverage_item")).to.deep.equal([116]);
  });

  it("$all_claims declared once at line 142 via 'as'", () => {
    expect(declLines("$all_claims")).to.deep.equal([142]);
  });

  it("$total_claims_count declared once at line 145 via 'var'", () => {
    expect(declLines("$total_claims_count")).to.deep.equal([145]);
  });

  it("$two_years_ago declared once at line 150 via 'var'", () => {
    expect(declLines("$two_years_ago")).to.deep.equal([150]);
  });

  it("$recent_claims_list declared once at line 155 via 'var'", () => {
    expect(declLines("$recent_claims_list")).to.deep.equal([155]);
  });

  it("$claim declared once at line 160 via 'each as $claim'", () => {
    expect(declLines("$claim")).to.deep.equal([160]);
  });

  it("$claim_date_ts declared once at line 162 via 'var'", () => {
    expect(declLines("$claim_date_ts")).to.deep.equal([162]);
  });

  it("$recent_claim_item declared once at line 169 via 'var'", () => {
    expect(declLines("$recent_claim_item")).to.deep.equal([169]);
  });

  it("$queried_by declared once at line 202 via 'var' (NOT again at line 217 via var.update)", () => {
    expect(declLines("$queried_by")).to.deep.equal([202]);
  });

  it("$shop declared once at line 212 via 'as'", () => {
    expect(declLines("$shop")).to.deep.equal([212]);
  });

  it("$result declared once at line 230 via 'var' (NOT again at line 242 via var.update)", () => {
    expect(declLines("$result")).to.deep.equal([230]);
  });

  // --- Usages: var.update targets count as usages ---

  it("$vehicle used at lines 29, 42-46, 57", () => {
    expect(usageLines("$vehicle")).to.deep.equal([29, 42, 43, 44, 45, 46, 57]);
  });

  it("$policy_response used at line 87 (var.update) and 233", () => {
    expect(usageLines("$policy_response")).to.include(87);
    expect(usageLines("$policy_response")).to.include(233);
  });

  it("$claims_summary used at line 188 (var.update) and 235", () => {
    expect(usageLines("$claims_summary")).to.include(188);
    expect(usageLines("$claims_summary")).to.include(235);
  });

  it("$queried_by used at line 217 (var.update), 241, 243", () => {
    expect(usageLines("$queried_by")).to.include(217);
    expect(usageLines("$queried_by")).to.include(241);
    expect(usageLines("$queried_by")).to.include(243);
  });

  it("$result used at line 242 (var.update), 243, 251", () => {
    expect(usageLines("$result")).to.include(242);
    expect(usageLines("$result")).to.include(243);
    expect(usageLines("$result")).to.include(251);
  });

  it("$coverages_response used at lines 127 and 234", () => {
    expect(usageLines("$coverages_response")).to.include(127);
    expect(usageLines("$coverages_response")).to.include(234);
  });

  it("$pc used at lines 112, 120-122", () => {
    expect(usageLines("$pc")).to.deep.equal([112, 120, 121, 122]);
  });

  it("$claim used at lines 163, 171-175", () => {
    expect(usageLines("$claim")).to.deep.equal([163, 171, 172, 173, 174, 175]);
  });

  // --- Validation results ---

  it("should produce zero undefined-variable warnings", () => {
    expect(result.warnings).to.be.empty;
  });

  it("should flag only $unused_variable as unused", () => {
    expect(result.hints).to.have.lengthOf(1);
    expect(result.hints[0].message).to.include("$unused_variable");
  });
});

describe("variable tracking - chained $ property accessors", () => {
  function validate(text) {
    const lexResult = lexDocument(text);
    const parser = xanoscriptParser(text);
    expect(parser.errors, "parse errors").to.be.empty;
    return validateVariables(parser.__symbolTable, lexResult.tokens);
  }

  it("does not flag a $ prefixed property in a member-access chain ($db.<table>.$search)", () => {
    const result = validate(`query q verb=GET {
  input
  stack {
    db.query user {
      where = $db.my_table.$search search? $input.values
    } as $user
  }
  response = $user
}`);
    const messages = result.warnings.map((w) => w.message);
    expect(messages).to.not.include("Unknown variable '$search'");
    expect(result.warnings).to.be.empty;
  });

  it("still flags a genuine unknown variable used in the same clause", () => {
    const result = validate(`query q verb=GET {
  input
  stack {
    db.query user {
      where = $db.my_table.id == $nonexistent
    } as $user
  }
  response = $user
}`);
    const messages = result.warnings.map((w) => w.message);
    expect(messages).to.include("Unknown variable '$nonexistent'");
  });
});
