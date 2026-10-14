import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../parser.js";

describe("guidFieldAttribute", () => {
  it("should parse guid in a table", () => {
    const parser = xanoscriptParser(`table "foo" {
      guid = "tgGYuUFKbBz4_6DIkDR5hUUCRno"
      auth = false
      schema {
        int id
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse guid in a function", () => {
    const parser = xanoscriptParser(`function "my/function" {
      guid = "dg4egGY_sadclkj231af32"
      input {
      }
      stack {
      }
      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse guid in a query", () => {
    const parser = xanoscriptParser(`query "test" verb = GET {
      guid = "abc123def456"
      api_group = "default"
      input {
      }
      stack {
      }
      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse guid in a task", () => {
    const parser = xanoscriptParser(`task "my_task" {
      guid = "task_guid_123"
      stack {
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse guid in an api_group", () => {
    const parser = xanoscriptParser(`api_group "my_group" {
      guid = "api_group_guid_123"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse guid in a middleware", () => {
    const parser = xanoscriptParser(`middleware "my_mw" {
      guid = "mw_guid_123"
      input {
      }
      stack {
      }
      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should not allow duplicate guid", () => {
    const parser = xanoscriptParser(`function "test" {
      guid = "first"
      guid = "second"
      input {
      }
      stack {
      }
      response = null
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should work without guid (optional)", () => {
    const parser = xanoscriptParser(`function "test" {
      input {
      }
      stack {
      }
      response = null
    }`);
    expect(parser.errors).to.be.empty;
  });
});
