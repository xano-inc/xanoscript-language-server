import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.visibilityFieldAttribute();
  return parser;
}

describe("visibilityFieldAttribute", () => {
  it("visibilityFieldAttribute accepts a private value", () => {
    const parser = parse(`visibility = "private"`);
    expect(parser.errors).to.be.empty;
  });

  it("visibilityFieldAttribute accepts an internal value", () => {
    const parser = parse(`visibility = "internal"`);
    expect(parser.errors).to.be.empty;
  });

  it("visibilityFieldAttribute accepts a public value", () => {
    const parser = parse(`visibility = "public"`);
    expect(parser.errors).to.be.empty;
  });

  it("visibilityFieldAttribute rejects anything else", () => {
    const parser = parse(`visibility = "something"`);
    expect(parser.errors).to.not.be.empty;
  });

  it("visibilityFieldAttribute rejects digit", () => {
    const parser = parse("visibility = 123");
    expect(parser.errors).to.not.be.empty;
  });

  it("visibilityFieldAttribute can be compact", () => {
    const parser = parse(`visibility="private"`);
    expect(parser.errors).to.be.empty;
  });
});
