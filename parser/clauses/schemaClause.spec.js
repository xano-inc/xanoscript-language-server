import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { parser } from "../test_parser.js";

function parse(inputText, context = null) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;

  if (context) {
    parser.sectionStack.push(context);
    parser.schemaClause();
    parser.sectionStack.pop();
  } else {
    parser.schemaClause();
  }

  return parser;
}

describe("schemaClause", () => {
  it("schemaClause accepts a field", () => {
    const parser = parse(`schema {
        int rank
      }`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause accepts a comment above a field", () => {
    const parser = parse(`schema {
        // some comment
        int rank
      }`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause accepts multiple fields", () => {
    const parser = parse(`schema {
        int rank
        text label
      }`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause does not require curlies", () => {
    const parser = parse(`schema`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause accepts a visibility when in a table definition", () => {
    const parser = parse(
      `schema {
      int rank {
        visibility = "private"
      }
      text label {
        visibility = "internal"
      }
    }`,
      "tableDeclaration",
    );
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause rejects a visibility when not in a table definition", () => {
    const parser = parse(`schema {
      int rank {
        visibility = "private"
      }
      text label {
        visibility = "internal"
      }
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("schemaClause accepts a description", () => {
    const parser = parse(`schema {
      text label {
        description = "This is a description"
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause field accepts a file type", () => {
    const parser = parse(`schema {
        file my_file?
      }`);
    expect(parser.errors).to.be.empty;
  });

  it("schemaClause field accepts a sensitivity marker", () => {
    const parser = parse(`schema {
      decimal value {
        sensitive = true
      }
    }`);
    expect(parser.errors).to.be.empty;
  });
});
