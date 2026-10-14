import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.historyClause();
  return parser;
}

describe("historyClause", () => {
  it("historyClause can be disabled", () => {
    const parser = parse(`history = false`);
    expect(parser.errors).to.be.empty;
  });

  it("historyClause can be inherited", () => {
    const parser = parse(`history = "inherit"`);
    expect(parser.errors).to.be.empty;
  });

  it("historyClause accepts all", () => {
    let parser = parse(`history = "all"`);
    expect(parser.errors).to.be.empty;

    // a bare `all` identifier is not the "all" string sentinel
    parser = parse(`history = all`);
    expect(parser.errors).to.not.be.empty;
  });

  // The backend serializes `history` as any user-set message limit
  // (`$item["history"]["message_limit"] ?? 100`), not a fixed set of magic
  // numbers, so every non-negative integer must be accepted — including values
  // like 12 / 50 / 250 / 100000 that the old fixed enum wrongly flagged.
  it("historyClause accepts any non-negative integer limit", () => {
    let parser = parse(`history = 0`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 10`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 12`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 50`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 100`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 250`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 1000`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 10000`);
    expect(parser.errors).to.be.empty;
    parser = parse(`history = 100000`);
    expect(parser.errors).to.be.empty;
  });

  it("historyClause rejects values outside the false | inherit | all | integer space", () => {
    // an arbitrary string is not one of false | "inherit" | "all"
    let parser = parse(`history = "nope"`);
    expect(parser.errors).to.not.be.empty;

    // the limit is an integer message count — a float is not a valid limit
    parser = parse(`history = 50.5`);
    expect(parser.errors).to.not.be.empty;

    // a negative limit is never emitted by the backend (it serializes as "all")
    parser = parse(`history = -1`);
    expect(parser.errors).to.not.be.empty;
  });
});
