import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("query_parser", () => {
  it("should parse a basic query", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should raise an error when a query name is empty", () => {
    const parser = xanoscriptParser(`query "" verb=GET {
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
    expect(parser.errors[0].message).to.include("must not be empty");
  });

  it("should raise an error when a query starts with /", () => {
    const parser = xanoscriptParser(`query "/foo" verb=GET {
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should accept an api_group", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      api_group = "Authentication";
      
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse accepts a response_type", () => {
    let parser = xanoscriptParser(`query foo verb=GET {

      response_type = "standard"

      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;

    parser = xanoscriptParser(`query foo verb=GET {
      response_type = "stream"

      input {
      }

      stack {
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a basic a query with slashes", () => {
    const parser = xanoscriptParser(`query "foo/bar" verb=GET {
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a basic a string query url", () => {
    const parser = xanoscriptParser(`query "foo/bar" verb=GET {
      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a basic a query with dynamic params", () => {
    const parser = xanoscriptParser(`query "foo/{user_id}" verb=GET {
      input {
        text user_id filters=trim
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should accept a middleware clause", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      input {
        text user_id filters=trim
      }

      stack {
      }

      response = null

      middleware = {pre: [{name: "M1"}], post: [{name: "M1"}]}
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should accept a test", () => {
    const parser = xanoscriptParser(`query test_expect verb=GET {
  input {
    int a
    int b
  }

  stack {
    var $sum {
      value = $input.a
    }
    math.add $sum {
      value = $input.b
    } 
  }

  response = $sum

  // description goes here
  test "should add two numbers" {
    input = {a: 20, b: 22}

    expect.to_equal ($response) {
      value = 42
    }
  }

  test "another test with input" {
    input = {a: 20, b: 22}

    expect.to_be_greater_than ($response) {
      value = 40
    }
  }
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should not allow api.call within a group in a query stack", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      input {
      }

      stack {
        group {
          stack {
            api.call bar verb=POST {
              api_group = "internal"
              input = { x: 1 }
            } as $result
          }
        }
      }

      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should accept external_access = false", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      external_access = false

      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should accept external_access = true", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      external_access = true

      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should accept external_access positioned after other clauses (order-independent)", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      input {
      }

      stack {
      }

      external_access = true

      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should raise an error on a duplicate external_access", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      external_access = true
      external_access = false

      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should raise a value-specific error for a non-boolean external_access", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      external_access = "yes"

      input {
      }

      stack {
      }

      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
    // The diagnostic points at the value (expecting true/false), not the
    // generic "Expecting --> } <--" close-brace error.
    expect(parser.errors[0].message).to.include("true");
    expect(parser.errors[0].message).to.include("false");
    expect(parser.errors[0].message).to.not.include("} <--");
  });
});
