import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.sectionStack.push("workflowTestDeclaration");
  parser.workflowExpectFn();
  return parser;
}

describe("workflowExpectFn", () => {
  it("workflowExpectFn accepts a string literal as value", () => {
    const parser = parse(`expect.to_equal ($response.email) {
      value = "email@example.com"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("workflowExpectFn accepts filtered values", () => {
    const parser = parse(`expect.to_equal ($total
      |subtract:$tax
      |subtract:$cost
    ) {
      value = $som_value
    }`);
    expect(parser.errors).to.be.empty;
  });
});
