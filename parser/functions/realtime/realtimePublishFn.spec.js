import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.realtimePublishFn();
  return parser;
}

describe("realtimePublishFn", () => {
  it("accepts minimal fieldset", () => {
    const parser = parse(`publish {
      realtime_server = "main"
      channel = "rooms/42"
      data = $payload
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts the full fieldset", () => {
    const parser = parse(`publish {
      realtime_server = "main"
      channel = "rooms/42"
      message = "chat"
      data = $payload
      auth_table = "user"
      auth_id = $auth.id
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("can be disabled", () => {
    const parser = parse(`publish {
      realtime_server = "main"
      channel = "rooms/42"
      data = $payload
      disabled = true
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts a description", () => {
    const parser = parse(`publish {
      description = "broadcast a server event"
      realtime_server = "main"
      channel = "rooms/42"
      data = $payload
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires a realtime_server field", () => {
    const parser = parse(`publish {
      channel = "rooms/42"
      data = $payload
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("requires a channel field", () => {
    const parser = parse(`publish {
      realtime_server = "main"
      data = $payload
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("requires a data field", () => {
    const parser = parse(`publish {
      realtime_server = "main"
      channel = "rooms/42"
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
