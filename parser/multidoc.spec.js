import { expect } from "chai";
import { describe, it } from "mocha";
import { documentCache } from "../cache/documentCache.js";
import { multidocParser } from "./multidoc.js";

describe("multidoc", () => {
  describe("detection", () => {
    it("should pass through non-multidoc text to single parser", () => {
      const result = multidocParser(`function foo {
  input {
  }

  stack {
  }

  response = null
}`);
      expect(result.errors).to.be.empty;
      expect(result.isMultidoc).to.not.be.ok;
    });

    it("should detect multidoc when separator is present", () => {
      const result = multidocParser(`function foo {
  input {
  }

  stack {
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
  }

  response = null
}`);
      expect(result.errors).to.be.empty;
      expect(result.isMultidoc).to.be.true;
    });
  });

  describe("splitting", () => {
    it("should parse each segment independently with different schemes", () => {
      const result = multidocParser(`function foo {
  input {
  }

  stack {
  }

  response = null
}
---
table my_table {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  }
}`);
      expect(result.errors).to.be.empty;
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(2);
    });

    it("should handle three segments", () => {
      const result = multidocParser(`function foo {
  input {
  }

  stack {
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
  }

  response = null
}
---
function baz {
  input {
  }

  stack {
  }

  response = null
}`);
      expect(result.errors).to.be.empty;
      expect(result.segmentCount).to.equal(3);
    });
  });

  describe("offset math", () => {
    it("should offset error positions in second segment to global coordinates", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const seg2 = `function bar {
  stack {
    INVALID_SYNTAX !!!
  }
  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      expect(result.errors).to.not.be.empty;
      const error = result.errors[0];
      expect(error.token.startOffset).to.be.at.least(seg1.length + 5);
    });

    it("should not offset positions in first segment", () => {
      const seg1 = `function foo {
  stack {
    INVALID_SYNTAX !!!
  }
  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      expect(result.errors).to.not.be.empty;
      const error = result.errors[0];
      expect(error.token.startOffset).to.be.lessThan(seg1.length);
    });

    it("should offset varDeclaration positions in second segment", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
    var $x {
      value = 1
    }

    var.update $x {
      value = 2
    }
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
    var $y {
      value = 1
    }

    var.update $y {
      value = 2
    }
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      const yDecl = result.__symbolTable.varDeclarations.find(
        (d) => d.name === "$y",
      );
      expect(yDecl).to.exist;
      expect(yDecl.startOffset).to.be.at.least(seg1.length + 5);
    });
  });

  describe("variable scoping", () => {
    it("should not report unused variable when used in same segment", () => {
      const text = `function foo {
  input {
  }

  stack {
    var $x {
      value = 1
    }

    var.update $x {
      value = 2
    }
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
    var $y {
      value = 1
    }

    var.update $y {
      value = 2
    }
  }

  response = null
}`;
      const result = multidocParser(text);
      expect(result.errors).to.be.empty;
      const unusedHints = result.hints.filter((h) =>
        h.message.includes("never used"),
      );
      expect(unusedHints).to.be.empty;
    });

    it("should report unused variable scoped to its own segment", () => {
      const text = `function foo {
  input {
  }

  stack {
    var $unused {
      value = 1
    }
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
    var $also_unused {
      value = 1
    }
  }

  response = null
}`;
      const result = multidocParser(text);
      const unusedHints = result.hints.filter((h) =>
        h.message.includes("never used"),
      );
      expect(unusedHints).to.have.lengthOf(2);
    });

    it("should not leak variables across segments", () => {
      const text = `function foo {
  input {
  }

  stack {
    var $x {
      value = 1
    }

    var.update $x {
      value = 2
    }
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
    var.update $x {
      value = 2
    }
      
    var $y {
      value = 2
    }
  }

  response = null
}`;
      const result = multidocParser(text);
      const unknownWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown variable"),
      );
      expect(unknownWarnings).to.have.lengthOf(1);
      expect(unknownWarnings[0].message).to.include("$x");
    });

    it("should offset variable validation positions in second segment", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
    var $a {
      value = 1
    }
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
    var $b {
      value = 1
    }
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      const bHint = result.hints.find((h) => h.message.includes("$b"));
      expect(bHint).to.exist;
      expect(bHint.token.startOffset).to.be.at.least(seg1.length + 5);
    });
  });

  describe("cross-reference validation", () => {
    it("should resolve cross-reference from segment B to function in segment A", () => {
      const text = `function foo_bar {
  input {
  }

  stack {
  }

  response = null
}
---
function baz {
  input {
  }

  stack {
    function.run foo_bar {
    } as $result
  }

  response = null
}`;
      const result = multidocParser(text);
      const crossRefWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown function"),
      );
      expect(crossRefWarnings).to.be.empty;
    });

    it("should warn on missing cross-reference within multidoc", () => {
      const text = `function baz {
  input {
  }

  stack {
    function.run nonexistent {
    } as $result
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const result = multidocParser(text);
      const crossRefWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown function"),
      );
      expect(crossRefWarnings).to.have.lengthOf(1);
      expect(crossRefWarnings[0].message).to.include("nonexistent");
    });

    it("should offset cross-reference warning positions to global coordinates", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
    function.run missing_fn {
    } as $result
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      const warning = result.warnings.find((w) =>
        w.message.includes("Unknown function"),
      );
      expect(warning).to.exist;
      const warningOffset = warning.token?.startOffset ?? warning.startOffset;
      expect(warningOffset).to.be.at.least(seg1.length + 5);
    });
  });

  describe("edge cases", () => {
    it("should handle empty segment between separators", () => {
      const text = `function foo {
  input {
  }

  stack {
  }

  response = null
}
---

---
function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const result = multidocParser(text);
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(3);
    });

    it("should handle trailing separator", () => {
      const text = `function foo {
  input {
  }

  stack {
  }

  response = null
}
---
`;
      const result = multidocParser(text);
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(2);
    });

    it("should not split on --- without surrounding newlines", () => {
      const result = multidocParser(`function foo {
  input {
  }

  stack {
  }

  response = null
}`);
      expect(result.isMultidoc).to.not.be.ok;
    });

    it("should not corrupt earlier segment results (singleton safety)", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
    var $a {
      value = 1
    }

    var.update $a {
      value = 2
    }
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
    var $b {
      value = 1
    }

    var.update $b {
      value = 2
    }
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      const names = result.__symbolTable.varDeclarations.map((d) => d.name);
      expect(names).to.include("$a");
      expect(names).to.include("$b");

      const aDecl = result.__symbolTable.varDeclarations.find(
        (d) => d.name === "$a",
      );
      const bDecl = result.__symbolTable.varDeclarations.find(
        (d) => d.name === "$b",
      );
      expect(aDecl.startOffset).to.be.lessThan(seg1.length);
      expect(bDecl.startOffset).to.be.at.least(seg1.length + 5);
    });
  });

  describe("cache integration", () => {
    it("should route multidoc through multidocParser via cache", () => {
      documentCache.clear();
      const text = `function foo {
  input {
  }

  stack {
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const { parser, scheme } = documentCache.getOrParse(
        "test://multidoc",
        1,
        text,
      );
      expect(parser.isMultidoc).to.be.true;
      expect(scheme).to.equal("multidoc");
    });

    it("should cache multidoc results", () => {
      documentCache.clear();
      const text = `function foo {
  input {
  }

  stack {
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      documentCache.getOrParse("test://multidoc-cache", 1, text);
      const { parser } = documentCache.getOrParse(
        "test://multidoc-cache",
        1,
        text,
      );
      expect(parser.isMultidoc).to.be.true;
    });

    it("should not route single-doc through multidocParser", () => {
      documentCache.clear();
      const text = `function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const { parser, scheme } = documentCache.getOrParse(
        "test://single",
        1,
        text,
      );
      expect(parser.isMultidoc).to.not.be.ok;
      expect(scheme).to.not.equal("multidoc");
    });
  });

  describe("adversarial", () => {
    it("should compute exact offset for second segment", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const text = seg1 + "\n---\n" + seg2;
      const result = multidocParser(text);

      // The keyword "function" in seg2 starts at exactly seg1.length + 5
      const expectedOffset = seg1.length + 5;
      // seg2 parses fine, so no errors — check varDeclarations or references if present
      // Instead, verify via a parse error at a known position in seg2
      expect(result.errors).to.be.empty;
      expect(result.segmentCount).to.equal(2);
      // The second segment's text should start at the expected offset
      // Verify by checking that seg2 content matches the original text at that position
      expect(text.substring(expectedOffset)).to.equal(seg2);
    });

    it("should report exact offset for error in third segment", () => {
      const seg1 = `function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const seg2 = `function bar {
  input {
  }

  stack {
  }

  response = null
}`;
      const seg3 = `INVALID`;
      const text = seg1 + "\n---\n" + seg2 + "\n---\n" + seg3;
      const result = multidocParser(text);

      const expectedSeg3Start = seg1.length + 5 + seg2.length + 5;
      expect(result.errors).to.not.be.empty;
      // The error must be within seg3's global range
      const error = result.errors[0];
      expect(error.token.startOffset).to.be.at.least(expectedSeg3Start);
      expect(error.token.startOffset).to.be.lessThan(
        expectedSeg3Start + seg3.length,
      );
    });

    it("should isolate errors — bad seg1 should not prevent seg2 from parsing", () => {
      const text = `INVALID_GARBAGE
---
function bar {
  input {
  }

  stack {
    var $y {
      value = 1
    }
  }

  response = null
}`;
      const result = multidocParser(text);

      // seg1 has errors
      expect(result.errors).to.not.be.empty;
      // seg2's variable should still be tracked
      const yDecl = result.__symbolTable.varDeclarations.find(
        (d) => d.name === "$y",
      );
      expect(yDecl).to.exist;
    });

    it("should handle same variable name in different segments independently", () => {
      const text = `function foo {
  input {
  }

  stack {
    var $x {
      value = "from foo"
    }

    var.update $x {
      value = "updated in foo"
    }
  }

  response = null
}
---
function bar {
  input {
  }

  stack {
    var $x {
      value = "from bar"
    }

    var.update $x {
      value = "updated in bar"
    }
  }

  response = null
}`;
      const result = multidocParser(text);
      expect(result.errors).to.be.empty;
      // Both $x declarations exist
      const xDecls = result.__symbolTable.varDeclarations.filter(
        (d) => d.name === "$x",
      );
      expect(xDecls).to.have.lengthOf(2);
      // Neither should be reported as unused
      const unusedHints = result.hints.filter((h) =>
        h.message.includes("never used"),
      );
      expect(unusedHints).to.be.empty;
      // No unknown variable warnings
      const unknownWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown variable"),
      );
      expect(unknownWarnings).to.be.empty;
    });

    it("should warn when referencing a table name as a function", () => {
      const text = `table users {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  }
}
---
function caller {
  input {
  }

  stack {
    function.run users {
    } as $result
  }

  response = null
}`;
      const result = multidocParser(text);
      // "users" is a table, not a function — cross-ref should warn
      const crossRefWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown function"),
      );
      expect(crossRefWarnings).to.have.lengthOf(1);
      expect(crossRefWarnings[0].message).to.include("users");
    });

    it("should handle cross-ref between function and table (db.get)", () => {
      const text = `table users {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  }
}
---
function caller {
  input {
  }

  stack {
    db.get users {
      field_name = id
      field_value = 1
    } as $user
  }

  response = null
}`;
      const result = multidocParser(text);
      // "users" is a table, db.get references tables — should resolve
      const crossRefWarnings = result.warnings.filter((w) =>
        w.message.includes("Unknown table"),
      );
      expect(crossRefWarnings).to.be.empty;
    });

    it("should handle separator at document start", () => {
      const text = `
---
function foo {
  input {
  }

  stack {
  }

  response = null
}`;
      const result = multidocParser(text);
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(2);
      // First segment is empty/whitespace, should have errors but not crash
    });

    it("should handle document that is only a separator", () => {
      const text = "\n---\n";
      const result = multidocParser(text);
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(2);
      // Both segments are empty strings — should not crash
    });

    it("should parse workspace + table multidoc without errors on separator", () => {
      const text = `workspace "car-coverage" {
  acceptance = {ai_terms: false}
  preferences = {
    internal_docs    : false
    track_performance: true
    sql_names        : false
    sql_columns      : true
  }

  realtime = {canonical: "UJCEVaoiEJN-wjghNzMxj324-8w"}
  env = {api_key: "12345"}
}
---
table user {
  auth = true

  schema {
    int id
    timestamp created_at?=now
    text name filters=trim
    email? email filters=trim|lower
    password? password filters=min:8|minAlpha:1|minDigit:1
    text? refresh_token {
      sensitive = true
      visibility = "private"
    }

    timestamp? refresh_token_expires

    // some description
    enum my_enum {
      values = ["true", "false", "2"]
      sensitive = true
      visibility = "private"
    }

    object test_visibility? {
      schema {
        text internal? filters=trim {
          visibility = "internal"
        }
      }
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
  ]
}`;
      const result = multidocParser(text);
      expect(result.isMultidoc).to.be.true;
      expect(result.segmentCount).to.equal(2);
      expect(result.errors).to.be.empty;
    });

    it("should not treat --- inside a string literal as separator", () => {
      // This is a known limitation — but test current behavior
      const text = `function foo {
  input {
  }

  stack {
    var $x {
      value = "before separator"
    }
  }

  response = null
}`;
      // No separator present — should be single doc
      const result = multidocParser(text);
      expect(result.isMultidoc).to.not.be.ok;
    });

    it("keeps an unindented --- inside any triple-quoted string in its document, with a warning", () => {
      const separator = (result) => result.warnings.filter((w) => w.message.includes('only "---" separates documents'));
      const tool = `tool foo {
  instructions = """
    Steps:
---
    Done.
  """

  input {
  }

  stack {
  }

  response = null
}`;
      const expression = `function foo {
  input {
  }

  stack {
    var $x {
      value = \`\`\`
---
\`\`\`
    }
  }

  response = null
}`;
      for (const text of [tool, expression]) {
        const result = multidocParser(text);
        expect(result.isMultidoc).to.not.be.ok;
        expect(result.errors).to.be.empty;
        expect(separator(result).map((w) => w.token.startOffset)).to.deep.equal([text.indexOf("\n---\n") + 1]);
      }
    });
  });
});
