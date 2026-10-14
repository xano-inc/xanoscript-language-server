import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.datadogMetricFn();
  return parser;
}

describe("datadogMetricFn", () => {
  it("accepts metric and value", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts metric, value, type, and tags", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
      type = "count"
      tags = '{"env":"prod"}'|json_decode
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("can be disabled", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
      disabled = true
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a description", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
      description = "send to datadog"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts datadog override fields", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
      service = "api"
      source = "php"
      env = "prod"
      hostname = "host-1"
      ddtags = "env:prod,team:api"
      timestamp = "2026-05-14T00:00:00Z"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a connection override", () => {
    const parser = parse(`metric {
      metric = "requests.count"
      value = 1
      connection = "udp://10.0.0.5:10514"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires metric and value", () => {
    const parser = parse(`metric {
      type = "count"
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
