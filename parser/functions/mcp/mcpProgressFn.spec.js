import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../../parser.js";

const inTool = (stack) =>
  xanoscriptParser(`tool t {
  input {
  }

  stack {
${stack}
  }

  response = null
}`);

describe("mcp.progress", () => {
  it("parses progress alone", () => {
    const parser = inTool(`    mcp.progress {
      progress = 1
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("parses progress, total and message", () => {
    const parser = inTool(`    var $i {
      value = 3
    }

    mcp.progress {
      progress = $i
      total = 100
      message = "Working " ~ $i
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires progress", () => {
    const parser = inTool(`    mcp.progress {
      total = 100
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("refuses an unknown attribute", () => {
    const parser = inTool(`    mcp.progress {
      progress = 1
      percent = 50
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("accepts a mock", () => {
    const parser = inTool(`    mcp.progress {
      progress = 1
      mock = {"t": 1}
    }`);
    expect(parser.errors).to.be.empty;
  });
});
