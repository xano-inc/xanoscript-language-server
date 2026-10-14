import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.filterFn();
  return parser;
}

function parseQuery(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.filterFn({ allowQueryExpression: true });
  return parser;
}

// Chained filters belong to the outer expression's filter loop, so test
// them through expressionFn rather than calling filterFn directly.
function parseExpression(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.expressionFn();
  return parser;
}

describe("filterFn", () => {
  it("filterFn accept valid filter", () => {
    const parser = parse(`|add:2`);
    expect(parser.errors).to.be.empty;
  });

  it("filterFn accept valid chained filter", () => {
    const parser = parseExpression(`1|add:2|divide:1`);
    expect(parser.errors).to.be.empty;
  });

  it("filterFn rejected non-existing filter", () => {
    const parser = parseExpression(`1|add:2|divider:1`);
    expect(parser.errors).to.not.be.empty;
  });

  it("filterFn accept valid query filter with allowQueryExpression", () => {
    const parser = parseQuery(`|between:18:65`);
    expect(parser.errors).to.be.empty;
  });

  it("filterFn reject invalid query filter with allowQueryExpression", () => {
    const parser = parseQuery(`|in:[1,2,3]`);
    expect(parser.errors).to.not.be.empty;
  });

  it("filterFn accept lambda_map with code string", () => {
    const parser = parse(`|lambda_map:"return $this * 2"`);
    expect(parser.errors).to.be.empty;
  });

  it("filterFn accept lambda_map with trailing timeout", () => {
    const parser = parse(`|lambda_map:"return $this * 2":10`);
    expect(parser.errors).to.be.empty;
  });

  it("filterFn accept lambda_reduce with initial value, code and timeout", () => {
    const parser = parse(
      `|lambda_reduce:[]:"return [...$result, $this + 1];":10`
    );
    expect(parser.errors).to.be.empty;
  });

  it("filterFn accept chained lambda filters", () => {
    const parser = parseExpression(
      `[1,2,3,8]|lambda_filter:"return $this % 2":10|lambda_find:"return $this === 8"`
    );
    expect(parser.errors).to.be.empty;
  });

  it("filterFn accept lambda variants of every/some/findIndex", () => {
    for (const name of [
      "lambda_every",
      "lambda_some",
      "lambda_findIndex",
    ]) {
      const parser = parse(`|${name}:"return $this > 2":10`);
      expect(parser.errors, name).to.be.empty;
    }
  });
});
