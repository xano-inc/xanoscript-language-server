import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";
function parse(inputText) {
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.asVariable();
  return parser;
}

describe("asVariable", () => {
  it("asVariable should be using a $var", () => {
    const parser = parse("as $foo");
    expect(parser.errors).to.be.empty;
  });

  it("asVariable should store the variable name", () => {
    const parser = parse("as $foo");
    expect(parser.__symbolTable.var["$foo"]).to.not.be.undefined;
  });

  it("asVariable should store the variable name", () => {
    const parser = parse("as $var.bar");
    expect(parser.__symbolTable.var["$bar"]).to.not.be.undefined;
  });

  it("asVariable rejects invalid variable names", () => {
    const parser = parse("as foo");
    expect(parser.errors).to.not.be.empty;
  });

  it("asVariable reject double $ sign in variable", () => {
    const parser = parse("as $$clients");
    expect(parser.errors).to.not.be.empty;
  });

  // Blacklisted variable names - these conflict with built-in variables
  // Some are blocked at lexer level (separate tokens), others at parser level
  describe("blacklisted variable names", () => {
    // These are lexed as ShortFormVariable and need explicit blacklisting
    const shortFormBlacklisted = ["output", "db", "toolset"];

    for (const name of shortFormBlacklisted) {
      it(`rejects as $${name} (short form)`, () => {
        const parser = parse(`as $${name}`);
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
      it(`rejects as $${name} (separate token)`, () => {
        const parser = parse(`as $${name}`);
        expect(parser.warnings).to.not.be.empty;
      });
    }

    // $var is the LongFormVariable prefix, parser expects a dot after it
    // FIXME: shoud be a warning, not an error, since it's still a valid variable name (albeit confusing)
    it("rejects as $var (long form prefix)", () => {
      const parser = parse("as $var");
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
      it(`rejects as $var.${name} (long form)`, () => {
        const parser = parse(`as $var.${name}`);
        expect(parser.warnings).to.not.be.empty;
        expect(parser.warnings[0].message).to.include("reserved");
      });
    }

    // Ensure valid names still work
    it("accepts as $user", () => {
      const parser = parse("as $user");
      expect(parser.warnings).to.be.empty;
    });

    it("accepts as $my_input", () => {
      const parser = parse("as $my_input");
      expect(parser.errors).to.be.empty;
      expect(parser.warnings).to.be.empty;
    });

    it("accepts as $var.my_var", () => {
      const parser = parse("as $var.my_var");
      expect(parser.warnings).to.be.empty;
    });
  });
});
