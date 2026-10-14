import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";
function parse(inputText) {
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.assignableVariableProperty();
  return parser;
}

describe("assignableVariableProperty", () => {
  it("assignableVariableProperty can be a short named variable", () => {
    const parser = parse("$users");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableProperty can be a variable", () => {
    const parser = parse("$var.users");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableProperty can be a short named variable with sub props", () => {
    const parser = parse("$users.x.y[1].z");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableProperty can be a variable with sub props", () => {
    const parser = parse("$var.users.x.y[1].z");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableProperty should warn on $env variable", () => {
    const parser = parse("$env.my_api_key");
    expect(parser.errors).to.be.empty;
    expect(parser.warnings).to.not.be.empty;
    expect(parser.warnings[0].message).to.include("reserved");
  });

  it("assignableVariableProperty should warn on $input variable", () => {
    const parser = parse("$input.remote_ip");
    expect(parser.errors).to.be.empty;
    expect(parser.warnings).to.not.be.empty;
    expect(parser.warnings[0].message).to.include("reserved");
  });

  it("assignableVariableProperty cannot be an indentifier", () => {
    const parser = parse(`"someting"`);
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableProperty accepts a pipe filter", () => {
    const parser = parse(`$users|trim`);
    expect(parser.errors).to.be.empty;
  });

  // Blacklisted variable names - these conflict with built-in variables
  // Some are blocked at lexer level (separate tokens), others at parser level
  describe("blacklisted variable names", () => {
    // These are lexed as ShortFormVariable and need explicit blacklisting
    const shortFormBlacklisted = ["output", "db", "toolset"];

    for (const name of shortFormBlacklisted) {
      it(`rejects $${name} as assignable variable (short form)`, () => {
        const parser = parse(`$${name}`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // These are separate tokens and already rejected by the parser
    // (not in the OR alternatives of assignableVariableProperty)
    const separateTokenBlacklisted = [
      "auth",
      "input",
      "env",
      "response",
      "error",
      "this",
    ];

    for (const name of separateTokenBlacklisted) {
      it(`rejects $${name} as assignable variable (separate token)`, () => {
        const parser = parse(`$${name}`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // $var is the LongFormVariable prefix, parser expects a dot after it
    it("warns when using $var as assignable variable (long form prefix)", () => {
      const parser = parse("$var");
      expect(parser.errors).to.be.empty;
      expect(parser.warnings).to.not.be.empty;
    });

    // All blacklisted names should be rejected in long form ($var.name)
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
      it(`rejects $var.${name} as assignable variable (long form)`, () => {
        const parser = parse(`$var.${name}`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // Ensure valid names still work
    it("accepts $user as assignable variable", () => {
      const parser = parse("$user");
      expect(parser.errors).to.be.empty;
    });

    it("accepts $my_input as assignable variable", () => {
      const parser = parse("$my_input");
      expect(parser.errors).to.be.empty;
    });

    it("accepts $var.my_var as assignable variable", () => {
      const parser = parse("$var.my_var");
      expect(parser.errors).to.be.empty;
    });
  });
});
