import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText, context = null) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;

  if (context) {
    parser.sectionStack.push(context);
    parser.triggerCallFn();
    parser.sectionStack.pop();
  } else {
    parser.triggerCallFn();
  }

  return parser;
}

describe("triggerCallFn", () => {
  it("should parse trigger.call statement", () => {
    const parser = parse(
      `trigger.call my_agent {
      input = {
        "key": "value"
      }
    } as $result`,
      "workflowTestDeclaration",
    );
    expect(parser.errors).to.be.empty;
  });

  it("trigger.call can be one liner without a body", () => {
    const parser = parse(
      `trigger.call my_agent as $result`,
      "workflowTestDeclaration",
    );
    expect(parser.errors).to.be.empty;
  });

  it("should not allow trigger.call statement outside of workflowTestDeclaration", () => {
    const parser = parse(`trigger.call my_agent {
      input = {
        "key": "value"
      }
    } as $result`);
    expect(parser.errors).to.not.be.empty;
  });
});
