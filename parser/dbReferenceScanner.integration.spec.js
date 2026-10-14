import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import { lexDocument } from "../lexer/lexer.js";
import { getSchemeFromContent } from "../utils.js";
import { crossFileValidate } from "../workspace/crossFileValidator.js";
import { WorkspaceIndex } from "../workspace/workspaceIndex.js";
import { scanDbReferences } from "./dbReferenceScanner.js";
import { xanoscriptParser } from "./parser.js";

/**
 * End-to-end: token scan of `$db.<table>.<column>` chains fed into the existing
 * cross-file validator against a workspace index that knows `my_table`'s columns.
 */
function buildIndex() {
  const index = new WorkspaceIndex();
  const content = `table my_table {
    schema {
      int id
      text name
    }
  }`;
  const scheme = getSchemeFromContent(content);
  const parser = xanoscriptParser(content, scheme);
  index.addParsed("file:///workspace/my_table.xs", content, parser.__symbolTable);
  return index;
}

function warningsFor(expr, index) {
  const refs = scanDbReferences(lexDocument(expr).tokens);
  return crossFileValidate(refs, index).map((w) => w.message);
}

describe("dbReferenceScanner + crossFileValidate integration", () => {
  let index;
  beforeEach(() => {
    index = buildIndex();
  });

  it("accepts a real column: $db.my_table.id", () => {
    expect(warningsFor(`x = $db.my_table.id`, index)).to.be.empty;
  });

  it("flags an unknown column: $db.my_table.nope", () => {
    const messages = warningsFor(`x = $db.my_table.nope`, index);
    expect(messages).to.have.lengthOf(1);
    expect(messages[0]).to.include('Unknown column "nope" in table "my_table"');
  });

  it("flags an unknown table: $db.ghost.id", () => {
    const messages = warningsFor(`x = $db.ghost.id`, index);
    expect(messages).to.have.lengthOf(1);
    expect(messages[0]).to.include('Unknown table "ghost"');
  });

  it("does NOT flag $-prefixed pseudo-columns: $db.my_table.$search", () => {
    expect(warningsFor(`x = $db.my_table.$search`, index)).to.be.empty;
  });

  it("accepts a table-only reference: $db.my_table", () => {
    expect(warningsFor(`x = $db.my_table`, index)).to.be.empty;
  });
});
