import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.securityJweEncodeLegacyFn();
  return parser;
}

describe("securityJweEncodeLegacyFn", () => {
  it("securityJweEncodeLegacyFn accepts attributes and store value in a variable", () => {
    const parser = parse(`jwe_encode_legacy {
      payload = $jwt_payload
      audience = "Xano"
      key = $env.magic_jwt_secret
      key_algorithm = "A256KW"
      content_algorithm = "A256CBC-HS512"
    } as $jwt`);
    expect(parser.errors).to.be.empty;
  });
});
