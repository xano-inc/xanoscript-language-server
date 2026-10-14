import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { getContentAssistSuggestions } from "../../../onCompletion/contentAssist.js";
import { xanoscriptParser } from "../../parser.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.dbIncrementFn();
  return parser;
}

describe("dbIncrementFn", () => {
  it("dbIncrementFn accepts the full form with an as $variable", () => {
    const parser = parse(`increment post {
      description = "bump the view counter"
      disabled = false
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
      return = {type: "count"}
      output = ["id", "view_count"]
      mock = {
        "should bump": 1
      }
    } as $updated`);
    expect(parser.errors).to.be.empty;
  });

  it("dbIncrementFn accepts a string literal table name", () => {
    const parser = parse(`increment "blog posts" {
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
    } as $updated`);
    expect(parser.errors).to.be.empty;
  });

  it("dbIncrementFn accepts a negative literal value", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "stock"
      value = -1
    } as $updated`);
    expect(parser.errors).to.be.empty;
  });

  it("dbIncrementFn accepts an expression value", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "stock"
      value = $input.qty|multiply:-1
    } as $updated`);
    expect(parser.errors).to.be.empty;
  });

  it("dbIncrementFn accepts return list and an addon block", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
      return = {type: "list"}
      addon = [
        {
          name : "post_author"
          input: {post_id: $output.id}
          as   : "author"
        }
      ]
    } as $updated`);
    expect(parser.errors).to.be.empty;
  });

  it("dbIncrementFn requires a where clause", () => {
    const parser = parse(`increment post {
      field_name = "view_count"
      value = 1
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("dbIncrementFn requires a field_name", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      value = 1
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("dbIncrementFn requires a value", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "view_count"
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("dbIncrementFn rejects an unknown key", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
      field = "x"
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("dbIncrementFn rejects an unknown key inside return", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
      return = {type: "count", paging: {page: 1}}
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("dbIncrementFn rejects an unsupported return type", () => {
    const parser = parse(`increment post {
      where = $db.post.id == $input.id
      field_name = "view_count"
      value = 1
      return = {type: "single"}
    } as $updated`);
    expect(parser.errors).to.not.be.empty;
  });

  it("db.increment parses inside a function stack", () => {
    const result = xanoscriptParser(`function "bump" {
      input {
        int id
      }
      stack {
        db.increment post {
          where = $db.post.id == $input.id
          field_name = "view_count"
          value = 1
        } as $updated
      }
      response = $updated
    }`);
    expect(result.errors).to.be.empty;
  });

  it("db.increment tracks the table reference and captures field_name", () => {
    const result = xanoscriptParser(`function "bump" {
      stack {
        db.increment post {
          where = $db.post.id == 1
          field_name = "view_count"
          value = 1
        } as $updated
      }
    }`);
    const refs = result.__symbolTable.references.filter(
      (r) => r.refType === "table" && r.fieldName === "view_count"
    );
    expect(refs).to.have.length(1);
    expect(refs[0].name).to.equal("post");
  });

  it("suggests increment after db.", () => {
    const suggestions = getContentAssistSuggestions(
      "function test {\n stack {\n db.",
      "function"
    );
    const labels = (suggestions || []).map((s) => s.label);
    expect(labels).to.include("increment");
  });
});
