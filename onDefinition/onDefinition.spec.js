import { expect } from "chai";
import { readFileSync } from "fs";
import { before, beforeEach, describe, it } from "mocha";
import { lexDocument } from "../lexer/lexer.js";
import { xanoscriptParser } from "../parser/parser.js";
import { WorkspaceIndex } from "../workspace/workspaceIndex.js";
import { findDefinition } from "./onDefinition.js";

describe("findDefinition", () => {
  let index;

  beforeEach(() => {
    index = new WorkspaceIndex();
    index.addFile("file:///ws/users.xs", "table users {\n  schema {\n  }\n}");
    index.addFile("file:///ws/helper.xs", 'function "helper" {\n}');
  });

  it("should find definition for function.run reference", () => {
    const text = `function "caller" {
      stack {
        function.run "helper" as $result
      }
    }`;
    const offset = text.indexOf('"helper"') + 1;
    const result = findDefinition(text, offset, index);
    expect(result).to.exist;
    expect(result.uri).to.equal("file:///ws/helper.xs");
  });

  it("should find definition for db.get reference", () => {
    const text = `function "caller" {
      stack {
        db.get users {
          field_name = "user_id"
          field_value = 1
        } as $user
      }
    }`;
    const offset = text.indexOf("users") + 2;
    const result = findDefinition(text, offset, index);
    expect(result).to.exist;
    expect(result.uri).to.equal("file:///ws/users.xs");
  });

  it("should return null when cursor is not on a reference", () => {
    const text = `function "caller" {
      stack {
      }
    }`;
    const offset = text.indexOf("stack") + 2;
    const result = findDefinition(text, offset, index);
    expect(result).to.be.null;
  });

  it("should return null when reference target not in index", () => {
    const text = `function "caller" {
      stack {
        function.run "unknown" as $result
      }
    }`;
    const offset = text.indexOf('"unknown"') + 1;
    const result = findDefinition(text, offset, index);
    expect(result).to.be.null;
  });
});

describe("findDefinition - variable go-to-definition with coverage_check.xs", () => {
  let text;
  let lexResult;
  let st;
  let index;
  let tokens;

  before(() => {
    text = readFileSync(
      new URL(
        "../parser/tests/variable_test/coverage_check.xs",
        import.meta.url,
      ),
      "utf8",
    );
    lexResult = lexDocument(text);
    const parser = xanoscriptParser(text, undefined, lexResult);
    st = { ...parser.__symbolTable };
    st.varDeclarations = [...parser.__symbolTable.varDeclarations];
    tokens = lexResult.tokens;
    index = new WorkspaceIndex();
  });

  function lineOf(offset) {
    return text.substring(0, offset).split("\n").length;
  }

  function findAtLine(line, varImage) {
    // Find token matching varImage on the given line
    for (const t of tokens) {
      if (t.image === varImage && lineOf(t.startOffset) === line) {
        return findDefinition(text, t.startOffset, index, st);
      }
    }
    throw new Error(`Token '${varImage}' not found on line ${line}`);
  }

  // --- Declarations should return NULL (already at definition) ---

  it("L26: as $vehicle (declaration) -> null", () => {
    expect(findAtLine(26, "$vehicle")).to.be.null;
  });

  it("L35: var $unused_variable (declaration) -> null", () => {
    expect(findAtLine(35, "$unused_variable")).to.be.null;
  });

  it("L63: as $policy (declaration) -> null", () => {
    expect(findAtLine(63, "$policy")).to.be.null;
  });

  it("L109: each as $pc (declaration) -> null", () => {
    expect(findAtLine(109, "$pc")).to.be.null;
  });

  it("L160: each as $claim (declaration) -> null", () => {
    expect(findAtLine(160, "$claim")).to.be.null;
  });

  // --- Built-in $db should return NULL ---

  it("L19: $db (built-in) -> null", () => {
    expect(findAtLine(19, "$db")).to.be.null;
  });

  // --- Usages should resolve to correct declaration line ---

  it("L29: $vehicle in precondition -> decl at L26", () => {
    const r = findAtLine(29, "$vehicle");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(26);
  });

  it("L42: $vehicle.vin in var value -> decl at L26", () => {
    const r = findAtLine(42, "$vehicle");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(26);
  });

  it("L57: $vehicle.id in db.query where -> decl at L26", () => {
    const r = findAtLine(57, "$vehicle");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(26);
  });

  it("L82: $policy in conditional if -> decl at L63", () => {
    const r = findAtLine(82, "$policy");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(63);
  });

  it("L87: $policy_response in var.update -> decl at L66", () => {
    const r = findAtLine(87, "$policy_response");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(66);
  });

  it("L89: $policy.policy_number in value -> decl at L63", () => {
    const r = findAtLine(89, "$policy");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(63);
  });

  it("L108: $policy_coverages in foreach -> decl at L105", () => {
    const r = findAtLine(108, "$policy_coverages");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(105);
  });

  it("L112: $pc.coverage_type_id in field_value -> decl at L109", () => {
    const r = findAtLine(112, "$pc");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(109);
  });

  it("L118: $ctype.code in value -> decl at L113", () => {
    const r = findAtLine(118, "$ctype");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(113);
  });

  it("L127: $coverages_response in array.push -> decl at L70", () => {
    const r = findAtLine(127, "$coverages_response");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(70);
  });

  it("L128: $coverage_item in value -> decl at L116", () => {
    const r = findAtLine(128, "$coverage_item");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(116);
  });

  it("L146: $all_claims in value -> decl at L142", () => {
    const r = findAtLine(146, "$all_claims");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(142);
  });

  it("L163: $claim.incident_date in value -> decl at L160", () => {
    const r = findAtLine(163, "$claim");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(160);
  });

  it("L168: $claim_date_ts in conditional if -> decl at L162", () => {
    const r = findAtLine(168, "$claim_date_ts");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(162);
  });

  it("L168: $two_years_ago in conditional if -> decl at L150", () => {
    const r = findAtLine(168, "$two_years_ago");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(150);
  });

  it("L179: $recent_claims_list in array.push -> decl at L155", () => {
    const r = findAtLine(179, "$recent_claims_list");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(155);
  });

  it("L180: $recent_claim_item in value -> decl at L169", () => {
    const r = findAtLine(180, "$recent_claim_item");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(169);
  });

  it("L188: $claims_summary in var.update -> decl at L74", () => {
    const r = findAtLine(188, "$claims_summary");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(74);
  });

  it("L190: $total_claims_count in value -> decl at L145", () => {
    const r = findAtLine(190, "$total_claims_count");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(145);
  });

  it("L216: $shop in conditional if -> decl at L212", () => {
    const r = findAtLine(216, "$shop");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(212);
  });

  it("L217: $queried_by in var.update -> decl at L202", () => {
    const r = findAtLine(217, "$queried_by");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(202);
  });

  it("L232: $vehicle_response in final result -> decl at L40", () => {
    const r = findAtLine(232, "$vehicle_response");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(40);
  });

  it("L233: $policy_response in final result -> decl at L66", () => {
    const r = findAtLine(233, "$policy_response");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(66);
  });

  it("L234: $coverages_response in final result -> decl at L70", () => {
    const r = findAtLine(234, "$coverages_response");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(70);
  });

  it("L235: $claims_summary in final result -> decl at L74", () => {
    const r = findAtLine(235, "$claims_summary");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(74);
  });

  it("L241: $queried_by in conditional if -> decl at L202", () => {
    const r = findAtLine(241, "$queried_by");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(202);
  });

  it("L242: $result in var.update -> decl at L230", () => {
    const r = findAtLine(242, "$result");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(230);
  });

  it("L243: $result in value expression -> decl at L230", () => {
    const r = findAtLine(243, "$result");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(230);
  });

  it("L243: $queried_by in value expression -> decl at L202", () => {
    const r = findAtLine(243, "$queried_by");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(202);
  });

  it("L251: $result in response = -> decl at L230", () => {
    const r = findAtLine(251, "$result");
    expect(r).to.exist;
    expect(lineOf(r.offset)).to.equal(230);
  });
});
