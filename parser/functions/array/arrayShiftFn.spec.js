import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.arrayShiftFn();
  return parser;
}

describe("arrayShiftFn", () => {
  it("arrayShiftFn requires a value and an return value", () => {
    const parser = parse(`array.shift $waiting_list as $next_customer`);
    expect(parser.errors).to.be.empty;
  });

  it("arrayShiftFn does not require an as $var statement", () => {
    const parser = parse(`array.shift $waiting_list`);
    expect(parser.errors).to.be.empty;
  });

  it("arrayShiftFn does not accept extra attributes", () => {
    const parser = parse(`array.shift {
      value = $waiting_list
      extraAttr = "value"
    } as $next_customer`);
    expect(parser.errors).to.not.be.empty;
  });
});
