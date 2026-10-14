import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";
function parse(inputText) {
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.assignableVariableAs();
  return parser;
}

describe("assignableVariableAs", () => {
  it("assignableVariableAs can be a short named variable", () => {
    const parser = parse("$users");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableAs can be a variable", () => {
    const parser = parse("$var.users");
    expect(parser.errors).to.be.empty;
  });

  it("assignableVariableAs cannot have a filter", () => {
    const parser = parse("$var.users|trim");
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableAs should warn on $var reserved variable names", () => {
    const parser = parse("$var");
    expect(parser.errors).to.be.empty;
    expect(parser.warnings).to.not.be.empty;
  });

  it("assignableVariableAs cannot be a short named variable with sub props", () => {
    const parser = parse("$users.x.y[1].z");
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableAs cannot be a variable with sub props", () => {
    const parser = parse("$var.users.x.y[1].z");
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableAs cannot be an env variable", () => {
    const parser = parse("$env.my_api_key");
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableAs cannot be an input variable", () => {
    const parser = parse("$input.remote_ip");
    expect(parser.errors).to.not.be.empty;
  });

  it("assignableVariableAs cannot be a string", () => {
    const parser = parse(`"someting"`);
    expect(parser.errors).to.not.be.empty;
  });

  // Blacklisted variable names - used in loop contexts (each as $variable)
  describe("blacklisted variable names", () => {
    // These are lexed as ShortFormVariable and need explicit blacklisting
    const shortFormBlacklisted = [
      "output",
      "db",
      "toolset",
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

    for (const name of shortFormBlacklisted) {
      it(`warns on $${name} (short form)`, () => {
        const parser = parse(`$${name}`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

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
      it(`warns on $var.${name} (long form)`, () => {
        const parser = parse(`$var.${name}`);
        expect(parser.errors).to.be.empty;
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // Ensure valid names still work
    it("accepts $item", () => {
      const parser = parse("$item");
      expect(parser.errors).to.be.empty;
    });

    it("accepts $i", () => {
      const parser = parse("$i");
      expect(parser.errors).to.be.empty;
    });

    it("accepts $var.my_var", () => {
      const parser = parse("$var.my_var");
      expect(parser.errors).to.be.empty;
    });
  });
});
