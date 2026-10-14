import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.datadogLogFn();
  return parser;
}

describe("datadogLogFn", () => {
  it("accepts a message", () => {
    const parser = parse(`log {
      message = "hi"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts message, status, and attributes", () => {
    const parser = parse(`log {
      message = "hi"
      status = "info"
      attributes = '{"A":"B"}'|json_decode
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("can be disabled", () => {
    const parser = parse(`log {
      message = "hi"
      disabled = true
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a description", () => {
    const parser = parse(`log {
      message = "hi"
      description = "log to datadog"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts datadog override fields", () => {
    const parser = parse(`log {
      message = "hi"
      service = "api"
      source = "php"
      env = "prod"
      hostname = "host-1"
      ddtags = "env:prod,team:api"
      tags = '{"env":"prod"}'|json_decode
      timestamp = "2026-05-14T00:00:00Z"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a connection override", () => {
    const parser = parse(`log {
      message = "hi"
      connection = "tcp://10.0.0.5:10518"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires a message", () => {
    const parser = parse(`log {
      status = "info"
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
