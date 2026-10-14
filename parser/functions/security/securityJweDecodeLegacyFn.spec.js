import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.securityJweDecodeLegacyFn();
  return parser;
}

describe("securityJweDecodeLegacyFn", () => {
  it("securityJweDecodeLegacyFn accepts attributes and store value in a variable", () => {
    const parser = parse(`jwe_decode_legacy {
      token = $input.magic_token
      key = $env.magic_jwt_secret
      audience = "Xano"
      key_algorithm = "A256KW"
      content_algorithm = "A256CBC-HS512"
    } as $decoded_magic_token`);
    expect(parser.errors).to.be.empty;
  });
});
