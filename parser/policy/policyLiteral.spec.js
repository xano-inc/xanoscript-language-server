import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { policyLiteralValue, readPolicyLiteral } from "./policyLiteral.js";

const read = (text) => {
  const tokens = lexDocument(text).tokens;
  return readPolicyLiteral(tokens, 0, tokens.length - 1);
};

describe("readPolicyLiteral", () => {
  it("reads objects, lists, strings, numbers, booleans and null", () => {
    const node = read(`{ a: ["x", 'y'], "b.c": -1.5, d: { e: true, f: null }, g: 3,\n  h: false }`);
    expect(policyLiteralValue(node)).to.deep.equal({
      a: ["x", "y"],
      "b.c": -1.5,
      d: { e: true, f: null },
      g: 3,
      h: false,
    });
  });

  it("keeps each value's token, for pointing at it", () => {
    const node = read(`{ tags: ["pci"] }`);
    expect(node.entries[0].keyToken.image).to.equal("tags");
    expect(node.entries[0].value.items[0].token.image).to.equal('"pci"');
  });

  it("reads escapes in double-quoted strings", () => {
    expect(policyLiteralValue(read(`{ a: "q\\"uote" }`))).to.deep.equal({ a: 'q"uote' });
  });

  it("marks what is not a literal", () => {
    const node = read(`{ a: $input.x, b: "x"|upper, c: 1 }`);
    expect(node.entries.map((entry) => entry.value.kind)).to.deep.equal(["expression", "expression", "number"]);
    expect(policyLiteralValue(node)).to.deep.equal({ a: undefined, b: undefined, c: 1 });
  });
});
