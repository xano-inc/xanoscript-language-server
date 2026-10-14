import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { xanoscriptParser } from "../parser/parser.js";
import { getSchemeFromContent } from "../utils.js";
import { crossFileValidate } from "./crossFileValidator.js";
import { WorkspaceIndex } from "./workspaceIndex.js";

/**
 * Helper to add a file with pre-parsed inputs (simulates what onDidChangeContent does).
 */
function addWithInputs(index, uri, content) {
  const scheme = getSchemeFromContent(content);
  const parser = xanoscriptParser(content, scheme);
  return index.addParsed(uri, content, parser.__symbolTable);
}

describe("crossFileValidator", () => {
  let index;

  beforeEach(() => {
    index = new WorkspaceIndex();
    index.addFile("file:///ws/users.xs", "table users {\n}");
    index.addFile("file:///ws/helper.xs", 'function "helper" {\n}');
    index.addFile("file:///ws/cleanup.xs", 'task "cleanup" {\n}');
    index.addFile(
      "file:///ws/get_user.xs",
      'query "/users/{user_id}" GET {\n}'
    );
  });

  it("should return no warnings for valid references", () => {
    const references = [
      { refType: "table", name: "users", startOffset: 50, endOffset: 55 },
      {
        refType: "function",
        name: "helper",
        startOffset: 100,
        endOffset: 108,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.be.empty;
  });

  it("should return warning for unknown function reference", () => {
    const references = [
      {
        refType: "function",
        name: "nonexistent",
        startOffset: 50,
        endOffset: 63,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("nonexistent");
    expect(warnings[0].message).to.include("function");
    expect(warnings[0].startOffset).to.equal(50);
    expect(warnings[0].endOffset).to.equal(63);
  });

  it("should return warning for unknown table reference", () => {
    const references = [
      { refType: "table", name: "orders", startOffset: 30, endOffset: 36 },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("orders");
    expect(warnings[0].message).to.include("table");
  });

  it("should return warning for unknown task reference", () => {
    const references = [
      {
        refType: "task",
        name: "missing_task",
        startOffset: 30,
        endOffset: 44,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("missing_task");
  });

  it("should return multiple warnings for multiple unknown references", () => {
    const references = [
      { refType: "table", name: "users", startOffset: 30, endOffset: 35 },
      {
        refType: "function",
        name: "bad_func",
        startOffset: 50,
        endOffset: 60,
      },
      {
        refType: "table",
        name: "bad_table",
        startOffset: 70,
        endOffset: 80,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(2);
  });

  it("should suggest 'did you mean' for similar function names", () => {
    const references = [
      { refType: "function", name: "helpr", startOffset: 50, endOffset: 55 },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("helpr");
    expect(warnings[0].message).to.include("Did you mean");
    expect(warnings[0].message).to.include("helper");
  });

  it("should suggest 'did you mean' for similar table names", () => {
    const references = [
      { refType: "table", name: "user", startOffset: 30, endOffset: 34 },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("Did you mean");
    expect(warnings[0].message).to.include("users");
  });

  it("should suggest 'did you mean' when input is a prefix of a candidate", () => {
    index.addFile(
      "file:///ws/seed_vehicles.xs",
      'function seed_vehicles {\n  stack {}\n}'
    );
    const references = [
      {
        refType: "function",
        name: "seed_veh",
        startOffset: 50,
        endOffset: 58,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.include("Did you mean");
    expect(warnings[0].message).to.include("seed_vehicles");
  });

  it("should not suggest 'did you mean' for completely different resource names", () => {
    const references = [
      {
        refType: "function",
        name: "xyzzy_foobar",
        startOffset: 50,
        endOffset: 62,
      },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.not.include("Did you mean");
  });

  it("should return empty array for empty references", () => {
    const warnings = crossFileValidate([], index);
    expect(warnings).to.be.empty;
  });

  it("should warn about empty function reference", () => {
    const references = [
      { refType: "function", name: "", startOffset: 50, endOffset: 52 },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.equal("Empty function reference");
  });

  it("should warn about empty table reference", () => {
    const references = [
      { refType: "table", name: "", startOffset: 50, endOffset: 52 },
    ];
    const warnings = crossFileValidate(references, index);
    expect(warnings).to.have.length(1);
    expect(warnings[0].message).to.equal("Empty table reference");
  });

  it("should return empty array for null/undefined references", () => {
    expect(crossFileValidate(null, index)).to.deep.equal([]);
    expect(crossFileValidate(undefined, index)).to.deep.equal([]);
  });

  describe("function input key validation", () => {
    beforeEach(() => {
      // Re-add helper with declared inputs (using addParsed for input resolution)
      addWithInputs(
        index,
        "file:///ws/helper.xs",
        `function "helper" {
          input {
            int user_id
            text name
          }
          stack {}
        }`
      );
    });

    it("should return no warnings when args match declared inputs", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: { user_id: { value: null }, name: { value: null } },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should warn about unknown input keys", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            user_id: { value: null },
            bad_key: { value: null, startOffset: 80, endOffset: 87 },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("bad_key");
      expect(warnings[0].message).to.include("helper");
      expect(warnings[0].startOffset).to.equal(80);
      expect(warnings[0].endOffset).to.equal(87);
    });

    it("should suggest 'did you mean' for similar input keys", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            usr_id: { value: null, startOffset: 80, endOffset: 86 },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("usr_id");
      expect(warnings[0].message).to.include("Did you mean");
      expect(warnings[0].message).to.include("user_id");
    });

    it("should not suggest 'did you mean' for completely different keys", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            zzzzzzz: { value: null, startOffset: 80, endOffset: 87 },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.not.include("Did you mean");
    });

    it("should skip input validation when args is undefined", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should skip input validation when target has no declared inputs", () => {
      // cleanup task has no inputs
      const references = [
        {
          refType: "task",
          name: "cleanup",
          startOffset: 50,
          endOffset: 57,
          args: { some_key: { value: null, startOffset: 70, endOffset: 78 } },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should warn about multiple unknown input keys", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            bad_one: { value: null, startOffset: 80, endOffset: 87 },
            bad_two: { value: null, startOffset: 90, endOffset: 97 },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(2);
    });

    it("should warn about type mismatch on literal values", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            user_id: {
              value: '"hello"',
              type: "text",
              startOffset: 80,
              endOffset: 87,
            },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("user_id");
      expect(warnings[0].message).to.include("int");
      expect(warnings[0].message).to.include("text");
    });

    it("should not warn when passing text literal to enum input", () => {
      addWithInputs(
        index,
        "file:///ws/with_enum.xs",
        `function "with_enum" {
          input {
            enum to_status ["a", "b"]
          }
          stack {}
        }`
      );
      const references = [
        {
          refType: "function",
          name: "with_enum",
          startOffset: 50,
          endOffset: 56,
          args: {
            to_status: {
              value: '"a"',
              type: "text",
              startOffset: 80,
              endOffset: 83,
            },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should not warn about type when value type is unknown", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            user_id: { value: null, type: null, startOffset: 80, endOffset: 87 },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should not warn when types match", () => {
      const references = [
        {
          refType: "function",
          name: "helper",
          startOffset: 50,
          endOffset: 56,
          args: {
            user_id: { value: "42", type: "int", startOffset: 80, endOffset: 82 },
            name: {
              value: '"test"',
              type: "text",
              startOffset: 90,
              endOffset: 96,
            },
          },
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });
  });

  describe("field_name column validation", () => {
    beforeEach(() => {
      // Add a table with columns (using addParsed for input resolution)
      addWithInputs(
        index,
        "file:///ws/users.xs",
        `table users {
          schema {
            int id
            text name
            text email
          }
        }`
      );
    });

    it("should return no warnings when field_name matches a column", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          fieldName: "id",
          fieldNameStartOffset: 50,
          fieldNameEndOffset: 52,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should warn when field_name does not match any column", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          fieldName: "username",
          fieldNameStartOffset: 50,
          fieldNameEndOffset: 58,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("username");
      expect(warnings[0].message).to.include("users");
      expect(warnings[0].startOffset).to.equal(50);
      expect(warnings[0].endOffset).to.equal(58);
    });

    it("should suggest 'did you mean' for similar column names", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          fieldName: "emal",
          fieldNameStartOffset: 50,
          fieldNameEndOffset: 54,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("Did you mean");
      expect(warnings[0].message).to.include("email");
    });

    it("should skip field_name validation when fieldName is undefined", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should skip field_name validation when table has no columns", () => {
      index.addFile("file:///ws/empty.xs", "table empty {\n}");
      const references = [
        {
          refType: "table",
          name: "empty",
          startOffset: 30,
          endOffset: 35,
          fieldName: "id",
          fieldNameStartOffset: 50,
          fieldNameEndOffset: 52,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should not validate field_name for unknown tables", () => {
      const references = [
        {
          refType: "table",
          name: "orders",
          startOffset: 30,
          endOffset: 36,
          fieldName: "id",
          fieldNameStartOffset: 50,
          fieldNameEndOffset: 52,
        },
      ];
      const warnings = crossFileValidate(references, index);
      // Should only get the "Unknown table" warning, not a column warning
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("Unknown table");
    });
  });

  describe("middleware reference validation", () => {
    beforeEach(() => {
      index.addFile(
        "file:///ws/auth.xs",
        'middleware "auth_middle" {\n  input {}\n  stack {}\n  response = null\n}'
      );
    });

    it("should return no warnings for valid middleware references", () => {
      const references = [
        {
          refType: "middleware",
          name: "auth_middle",
          startOffset: 50,
          endOffset: 63,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should warn about unknown middleware references", () => {
      const references = [
        {
          refType: "middleware",
          name: "nonexistent_middle",
          startOffset: 50,
          endOffset: 68,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("middleware");
      expect(warnings[0].message).to.include("nonexistent_middle");
    });

    it("should suggest 'did you mean' for similar middleware names", () => {
      const references = [
        {
          refType: "middleware",
          name: "auth_middl",
          startOffset: 50,
          endOffset: 60,
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("Did you mean");
      expect(warnings[0].message).to.include("auth_middle");
    });
  });

  describe("data keys column validation", () => {
    beforeEach(() => {
      addWithInputs(
        index,
        "file:///ws/users.xs",
        `table users {
          schema {
            int id
            text name
            text email
          }
        }`
      );
    });

    it("should return no warnings when data keys match columns", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          dataKeys: [
            { name: "name", startOffset: 60, endOffset: 64 },
            { name: "email", startOffset: 70, endOffset: 75 },
          ],
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.be.empty;
    });

    it("should warn about unknown data keys", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          dataKeys: [
            { name: "username", startOffset: 60, endOffset: 68 },
          ],
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("username");
      expect(warnings[0].message).to.include("users");
      expect(warnings[0].startOffset).to.equal(60);
    });

    it("should suggest 'did you mean' for similar data keys", () => {
      const references = [
        {
          refType: "table",
          name: "users",
          startOffset: 30,
          endOffset: 35,
          dataKeys: [
            { name: "emal", startOffset: 60, endOffset: 64 },
          ],
        },
      ];
      const warnings = crossFileValidate(references, index);
      expect(warnings).to.have.length(1);
      expect(warnings[0].message).to.include("Did you mean");
      expect(warnings[0].message).to.include("email");
    });
  });
});
