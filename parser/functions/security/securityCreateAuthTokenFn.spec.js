import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.securityCreateAuthTokenFn();
  return parser;
}

describe("securityCreateAuthTokenFn", () => {
  it("securityCreateAuthTokenFn accepts attributes and store value in a variable", () => {
    const parser = parse(`create_auth_token {
      table = "empty"
      extras = {}
      expiration = 86400
      id = $user.id
    } as $authToken`);
    expect(parser.errors).to.be.empty;
  });

  it("securityCreateAuthTokenFn requires an expiration attribute", () => {
    const parser = parse(`create_auth_token {
      table = "empty"
      extras = {}
      id = $user.id
    } as $authToken`);
    expect(parser.errors).to.not.be.empty;
  });

  it("securityCreateAuthTokenFn requires an extra attribute", () => {
    const parser = parse(`create_auth_token {
      table = "empty"
      expiration = 86400
      id = $user.id
    } as $authToken`);
    expect(parser.errors).to.not.be.empty;
  });

  it("securityCreateAuthTokenFn requires a table attribute", () => {
    const parser = parse(`create_auth_token {
      expiration = 86400
      id = $user.id
      extras = {"role": "admin"}
    } as $authToken`);
    expect(parser.errors).to.not.be.empty;
  });
});
