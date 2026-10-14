import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.datadogLogBulkFn();
  return parser;
}

describe("datadogLogBulkFn", () => {
  it("accepts entries", () => {
    const parser = parse(`log_bulk {
      entries = $entries
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("can be disabled", () => {
    const parser = parse(`log_bulk {
      entries = $entries
      disabled = true
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a description", () => {
    const parser = parse(`log_bulk {
      entries = $entries
      description = "bulk log to datadog"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires entries", () => {
    const parser = parse(`log_bulk {
      description = "no entries"
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
