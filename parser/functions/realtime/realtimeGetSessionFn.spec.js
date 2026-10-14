import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.realtimeGetSessionFn();
  return parser;
}

function parseStack(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.nakedStackFn();
  return parser;
}

describe("realtimeGetSessionFn", () => {
  it("realtimeGetSessionFn can have an empty body", () => {
    const parser = parse(`get_session as $session`);
    expect(parser.errors).to.be.empty;
  });

  it("realtimeGetSessionFn accepts a description", () => {
    const parser = parse(`get_session {
      description = "foo"
    } as $session`);
    expect(parser.errors).to.be.empty;
  });

  it("realtimeGetSessionFn can be disabled", () => {
    const parser = parse(`get_session {
      disabled = true
    } as $session`);
    expect(parser.errors).to.be.empty;
  });

  it("realtime.get_session parses cleanly inside a stack", () => {
    const parser = parseStack(`{
  realtime.get_session as $session
}`);
    expect(parser.errors).to.be.empty;
  });
});
