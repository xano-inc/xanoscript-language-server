import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.varFn();
  return parser;
}

describe("varFn", () => {
  it("varFn accepts a string literal as value", () => {
    const parser = parse(`var $user {
      value = "email"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accepts the attribute of a filtered value", () => {
    const parser = parse(`var $user_enabled {
      value = ($user_preferences|first).enabled
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accepts a filter in the value", () => {
    const parser = parse(`var $transaction_count {
      value = $daily_sales|count
      description = "Count number of transactions"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accept a keyword as object key", () => {
    const parser = parse(`var $token {
      value = {
        encrypted_token: "abc123"
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accepts a multiline object with commas separated values", () => {
    const parser = parse(`var $rank_order {
      value = {
        "ensign": 1,
        "lieutenant junior grade": 2,
        "lieutenant": 3,
        "lieutenant commander": 4,
        "commander": 5,
        "captain": 6,
        "commodore": 7,
        "rear admiral": 8,
        "vice admiral": 9,
        "admiral": 10
      }
      description = "Defines a numerical order for Starfleet ranks."
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accepts a description marker", () => {
    const parser = parse(`var $user {
      value = 12.345
      description = "The user's email address"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn requires a value field ", () => {
    const parser = parse(`var $user {
      description = "The user's email address"
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("varFn fields can be defined in random order", () => {
    const parser = parse(`var $user {
      description = "The user's email address"
      value = $email
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn allows range expressions", () => {
    const parser = parse(`var $numbers {
      value = (1..100)
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn allows range expressions with variables", () => {
    const parser = parse(`var $numbers {
      value = ($var.start..$end_var)
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn allows a bare range expression without parentheses", () => {
    const parser = parse(`var $x1 {
      value = 1..10
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn allows a range piped to a filter", () => {
    const parser = parse(`var $x1 {
      value = (1..10)|sum
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accepts a system env variable", () => {
    const parser = parse(`var $user {
      value = $env.$remote_ip
      description = "The user's email address"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn accept scientific notation", () => {
    const parser = parse(`  var $x1 {
      value = 4.21E-6
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn expect a variable name", () => {
    const parser = parse(`var {
      value = "email"
      description = "The user's email address"
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("varFn accepts an $env.$http_headers object as the value", () => {
    const parser = parse(`var $http_headers {
      value = $env.$http_headers
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn expect an as variable to be an identifier", () => {
    const parser = parse(`var "user" {
      value = "email"
      description = "The user's email address"
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("varFn can update a value", () => {
    const parser = parse(`var.update $user.foo {
      value = "email"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("varFn can update a value", () => {
    const parser = parse(`var.update $http_headers.Referer {
      value = "example.com"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("var.update should allow $input reference in its filters", () => {
    const parser = parse(`var.update $object_for_update {
      value = $object_for_update
        |merge_recursive:{$input.key:$input.value}
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should allow accessing a property from an object defined in place", () => {
    let parser = parse(`var $config {
      value = {
        api_key: "12345",
        timeout: 30
      }.api_key
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = {
        api_key: "12345",
        timeout: 30
      }["api_key"]
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = {
        api_key: "12345",
        timeout: 30
      }.["api_key"]
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = {
        api_key: "12345",
        timeout: 30
      }.api-key
      description = "API key from config"
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should allow accessing an index from an array defined in place", () => {
    let parser = parse(`var $config {
      value = [1,2,3].0
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = [1,2,3][1]
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = [1,2,3].[1]
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;

    parser = parse(`var $config {
      value = [1,2,3][$index]
      description = "API key from config"
    }`);
    expect(parser.errors).to.be.empty;
  });

  // Blacklisted variable names - these conflict with built-in variables
  // Some are blocked at lexer level (separate tokens), others at parser level
  describe("blacklisted variable names", () => {
    // These are lexed as ShortFormVariable and need explicit blacklisting
    const shortFormBlacklisted = ["output", "db", "toolset"];

    for (const name of shortFormBlacklisted) {
      it(`rejects var $${name} as variable name (short form)`, () => {
        const parser = parse(`var $${name} {
          value = "test"
        }`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });

      it(`rejects var.update $${name} as variable name (short form)`, () => {
        const parser = parse(`var.update $${name} {
          value = "test"
        }`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // These are separate tokens and already rejected by the parser
    const separateTokenBlacklisted = [
      "auth",
      "input",
      "env",
      "response",
      "error",
      "this",
    ];

    for (const name of separateTokenBlacklisted) {
      it(`warns var $${name} as variable name (separate token)`, () => {
        const parser = parse(`var $${name} {
          value = "test"
        }`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });

      it(`warns var.update $${name} as variable name (separate token)`, () => {
        const parser = parse(`var.update $${name} {
          value = "test"
        }`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // $var is the LongFormVariable prefix, parser expects a dot after it
    it("warns var $var as variable name (long form prefix)", () => {
      const parser = parse(`var $var {
        value = "test"
      }`);
      expect(parser.warnings).to.not.be.empty;
      expect(parser.errors).to.be.empty;
    });

    it("accepts a backtick expression as value", () => {
      const parser = parse(`var $current_time {
        value = \`12316546543321321.3213521654654\`
      }`);
      expect(parser.errors).to.be.empty;
    });

    // All blacklisted names should be rejected in long form via var.update
    const allBlacklisted = [
      "auth",
      "input",
      "env",
      "response",
      "output",
      "var",
      "db",
      "error",
      "toolset",
      "this",
    ];

    for (const name of allBlacklisted) {
      it(`rejects var.update $var.${name} as variable name (long form)`, () => {
        const parser = parse(`var.update $var.${name} {
          value = "test"
        }`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // Ensure valid names still work
    it("accepts var $user as variable name", () => {
      const parser = parse(`var $user {
        value = "test"
      }`);
      expect(parser.errors).to.be.empty;
    });

    it("accepts var $my_input as variable name", () => {
      const parser = parse(`var $my_input {
        value = "test"
      }`);
      expect(parser.errors).to.be.empty;
    });
  });
});
