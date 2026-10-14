import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { xanoscriptParser } from "../parser/parser.js";
import { getSchemeFromContent } from "../utils.js";
import { WorkspaceIndex } from "./workspaceIndex.js";

/**
 * Helper to add a file with pre-parsed inputs (simulates what onDidChangeContent does).
 */
function addWithInputs(index, uri, content) {
  const scheme = getSchemeFromContent(content);
  const parser = xanoscriptParser(content, scheme);
  return index.addParsed(uri, content, parser.__symbolTable);
}

describe("WorkspaceIndex", () => {
  let index;

  beforeEach(() => {
    index = new WorkspaceIndex();
  });

  describe("addFile (lightweight indexing)", () => {
    it("should index type and name from a function file", () => {
      index.addFile(
        "file:///workspace/my_func.xs",
        `function "my_func" {
        input {
          int user_id
          text? name
        }
      }`
      );
      expect(index.has("function", "my_func")).to.be.true;
      const entry = index.getByUri("file:///workspace/my_func.xs");
      expect(entry.type).to.equal("function");
      expect(entry.name).to.equal("my_func");
    });

    it("should index a query file", () => {
      index.addFile(
        "file:///workspace/get_users.xs",
        'query "/users" GET {\n}'
      );
      expect(index.has("query", "/users")).to.be.true;
    });

    it("should index a task file", () => {
      index.addFile(
        "file:///workspace/cleanup.xs",
        'task "daily_cleanup" {\n}'
      );
      expect(index.has("task", "daily_cleanup")).to.be.true;
    });

    it("should return false for unparseable content", () => {
      const result = index.addFile("file:///workspace/bad.xs", "not valid");
      expect(result).to.be.false;
    });

    it("should update entry when file content changes", () => {
      index.addFile(
        "file:///workspace/my_func.xs",
        'function "my_func" {\n}'
      );
      index.addFile(
        "file:///workspace/my_func.xs",
        'function "renamed" {\n}'
      );
      expect(index.has("function", "my_func")).to.be.false;
      expect(index.has("function", "renamed")).to.be.true;
    });
  });

  describe("addParsed (with inputs)", () => {
    it("should index a function file with inputs", () => {
      const content = `function "my_func" {
        input {
          int user_id
          text? name
        }
      }`;
      addWithInputs(index, "file:///workspace/my_func.xs", content);
      const entry = index.get("function", "my_func");
      expect(entry).to.exist;
      expect(entry.uri).to.equal("file:///workspace/my_func.xs");
      expect(entry.type).to.equal("function");
      expect(entry.name).to.equal("my_func");
      expect(entry.inputs).to.have.property("user_id");
      expect(entry.inputs.user_id.type).to.equal("int");
      expect(entry.inputs.name.nullable).to.be.true;
    });

    it("should index a table file with columns", () => {
      const content = `table users {
        schema {
          int id
          text name
          timestamp created_at?=now
        }
      }`;
      addWithInputs(index, "file:///workspace/users.xs", content);
      const entry = index.get("table", "users");
      expect(entry).to.exist;
      expect(entry.name).to.equal("users");
      expect(entry.inputs).to.have.property("id");
      expect(entry.inputs.id.type).to.equal("int");
      expect(entry.inputs).to.have.property("name");
      expect(entry.inputs.name.type).to.equal("text");
      expect(entry.inputs.created_at.optional).to.be.true;
    });
  });

  describe("removeFile", () => {
    it("should remove an indexed file", () => {
      index.addFile(
        "file:///workspace/my_func.xs",
        'function "my_func" {\n}'
      );
      index.removeFile("file:///workspace/my_func.xs");
      expect(index.get("function", "my_func")).to.be.undefined;
    });

    it("should be a no-op for unknown URIs", () => {
      index.removeFile("file:///workspace/unknown.xs");
      // No error thrown
    });
  });

  describe("getByType", () => {
    it("should return all entries for a type", () => {
      index.addFile("file:///workspace/a.xs", 'function "func_a" {\n}');
      index.addFile("file:///workspace/b.xs", 'function "func_b" {\n}');
      index.addFile("file:///workspace/t.xs", "table users {\n}");

      const functions = index.getByType("function");
      expect(functions).to.have.length(2);
      expect(functions.map((f) => f.name)).to.include.members([
        "func_a",
        "func_b",
      ]);
    });

    it("should return empty array for unknown type", () => {
      expect(index.getByType("function")).to.deep.equal([]);
    });
  });

  describe("has", () => {
    it("should return true for indexed entries", () => {
      index.addFile("file:///workspace/a.xs", 'function "my_func" {\n}');
      expect(index.has("function", "my_func")).to.be.true;
    });

    it("should return false for missing entries", () => {
      expect(index.has("function", "nonexistent")).to.be.false;
    });
  });

  describe("getAllNames", () => {
    it("should return all names for a type", () => {
      index.addFile("file:///workspace/a.xs", 'function "func_a" {\n}');
      index.addFile("file:///workspace/b.xs", 'function "func_b" {\n}');
      const names = index.getAllNames("function");
      expect(names).to.include.members(["func_a", "func_b"]);
    });
  });

  describe("uri reverse lookup", () => {
    it("should find entry by URI", () => {
      index.addFile("file:///workspace/a.xs", 'function "my_func" {\n}');
      const entry = index.getByUri("file:///workspace/a.xs");
      expect(entry).to.exist;
      expect(entry.name).to.equal("my_func");
      expect(entry.type).to.equal("function");
    });
  });

  describe("name collision", () => {
    it("should overwrite when two files define same type+name", () => {
      index.addFile("file:///workspace/a.xs", 'function "helper" {\n}');
      index.addFile("file:///workspace/b.xs", 'function "helper" {\n}');
      const entry = index.get("function", "helper");
      expect(entry).to.exist;
      expect(entry.uri).to.equal("file:///workspace/b.xs");
      expect(index.getByUri("file:///workspace/a.xs")).to.be.undefined;
    });
  });
});
