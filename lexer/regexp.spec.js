import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "./lexer.js";

function getTokenTypes(text) {
  const result = lexDocument(text);
  return {
    tokens: result.tokens.map((t) => ({
      type: t.tokenType.name,
      image: t.image,
    })),
    errors: result.errors,
  };
}

describe("RegExpToken lexer", () => {
  it("should not lex a standalone regex without preceding colon", () => {
    const { tokens } = getTokenTypes("/[^213]*/");
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(0);
  });

  it("should lex a regex after a colon", () => {
    const { tokens, errors } = getTokenTypes("pattern:/[^213]*/");
    expect(errors).to.be.empty;
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(1);
    expect(regexpTokens[0].image).to.equal("/[^213]*/");
  });

  it("should lex / as divide after an identifier", () => {
    const { tokens } = getTokenTypes("var_rel/55");
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(0);
  });

  it("should lex / as divide after a number", () => {
    const { tokens } = getTokenTypes("55/2");
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(0);
  });

  it("should lex / as divide after closing paren", () => {
    const { tokens } = getTokenTypes("(1+2)/3");
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
  });

  it("should not capture division as regex in complex expressions", () => {
    const { tokens, errors } = getTokenTypes("$SomeVar.0.var_rel/55");
    expect(errors).to.be.empty;
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(0);
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
  });

  it("should lex / as divide with spaces around it", () => {
    const { tokens, errors } = getTokenTypes("$var /64");
    expect(errors).to.be.empty;
    const regexpTokens = tokens.filter((t) => t.type === "RegExpToken");
    expect(regexpTokens).to.have.length(0);
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
  });

  it("should lex / as divide with space only before it", () => {
    const { tokens, errors } = getTokenTypes("$var/ 64");
    expect(errors).to.be.empty;
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(1);
  });

  it("should lex / as divide when no spaces around a value", () => {
    const { tokens, errors } = getTokenTypes("$var /64/ 34");
    expect(errors).to.be.empty;
    const divideTokens = tokens.filter((t) => t.type === "Divide");
    expect(divideTokens).to.have.length(2);
  });
});
