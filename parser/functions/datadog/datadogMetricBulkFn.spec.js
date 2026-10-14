import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.datadogMetricBulkFn();
  return parser;
}

describe("datadogMetricBulkFn", () => {
  it("accepts entries", () => {
    const parser = parse(`metric_bulk {
      entries = $entries
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("can be disabled", () => {
    const parser = parse(`metric_bulk {
      entries = $entries
      disabled = true
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a description", () => {
    const parser = parse(`metric_bulk {
      entries = $entries
      description = "bulk metrics to datadog"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires entries", () => {
    const parser = parse(`metric_bulk {
      description = "no entries"
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
