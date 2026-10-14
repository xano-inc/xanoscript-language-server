import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.apiMicroserviceFn();
  return parser;
}

describe("apiMicroserviceFn", () => {
  it("apiMicroserviceFn accepts basic fields", () => {
    const parser = parse(`microservice {
      host = "http://localhost:3000"
      path = "/reload"
      method = "POST"
      params = {}
      headers = []
      timeout = 60
      follow_location = true
    } as $api_1`);
    expect(parser.errors).to.be.empty;
  });

  it("apiMicroserviceFn accepts filtered path, params, and headers", () => {
    const parser = parse(`microservice {
      host = $host
      path = "/organisation/%s/send/%s"
        |sprintf:$input.organisationId:$input.entityType
      method = "POST"
      params = {}
        |set:"message":$input.message
        |set:"properties":$input.properties
      headers = []
        |push:"Content-Type: application/json"
      timeout = 10
      follow_location = true
    } as $api_1`);
    expect(parser.errors).to.be.empty;
  });

  it("apiMicroserviceFn accepts inline filters on path", () => {
    const parser = parse(`microservice {
      host = $host
      path = "/send/%s"|sprintf:$input.key
      method = "POST"
      params = {}
        |set:"message":$input.message
        |set:"properties":$input.properties
      headers = []
        |push:"Content-Type: application/json"
      timeout = 10
      follow_location = true
    } as $api_1`);
    expect(parser.errors).to.be.empty;
  });

  it("apiMicroserviceFn requires host, path, and method", () => {
    let parser = parse(`microservice {
      path = "/x"
      method = "GET"
    } as $api_1`);
    expect(parser.errors).to.not.be.empty;

    parser = parse(`microservice {
      host = $host
      method = "GET"
    } as $api_1`);
    expect(parser.errors).to.not.be.empty;

    parser = parse(`microservice {
      host = $host
      path = "/x"
    } as $api_1`);
    expect(parser.errors).to.not.be.empty;
  });

  it("apiMicroserviceFn can be disabled with a description", () => {
    const parser = parse(`microservice {
      description = "call the reload endpoint"
      host = $host
      path = "/reload"
      method = "POST"
      disabled = true
    } as $api_1`);
    expect(parser.errors).to.be.empty;
  });
});
