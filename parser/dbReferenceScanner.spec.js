import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../lexer/lexer.js";
import { scanDbReferences } from "./dbReferenceScanner.js";

function scan(text) {
  return scanDbReferences(lexDocument(text).tokens);
}

describe("dbReferenceScanner", () => {
  it("captures a table + column reference from $db.<table>.<column>", () => {
    const refs = scan(`x = $db.my_table.id`);
    expect(refs).to.have.lengthOf(1);
    expect(refs[0]).to.include({ refType: "table", name: "my_table", fieldName: "id" });
  });

  it("underlines the table name for the table reference", () => {
    const text = `x = $db.my_table.id`;
    const refs = scan(text);
    const { startOffset, endOffset } = refs[0];
    expect(text.slice(startOffset, endOffset + 1)).to.equal("my_table");
  });

  it("underlines the column for the fieldName offsets", () => {
    const text = `x = $db.my_table.id`;
    const refs = scan(text);
    const { fieldNameStartOffset, fieldNameEndOffset } = refs[0];
    expect(text.slice(fieldNameStartOffset, fieldNameEndOffset + 1)).to.equal("id");
  });

  it("does NOT set fieldName for $-prefixed pseudo-columns ($search)", () => {
    const refs = scan(`x = $db.my_table.$search`);
    expect(refs).to.have.lengthOf(1);
    expect(refs[0]).to.include({ refType: "table", name: "my_table" });
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("does NOT set fieldName for $this pseudo-columns", () => {
    const refs = scan(`x = $db.my_table.$this`);
    expect(refs).to.have.lengthOf(1);
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("captures a table-only reference when no column follows", () => {
    const refs = scan(`x = $db.my_table`);
    expect(refs).to.have.lengthOf(1);
    expect(refs[0]).to.include({ refType: "table", name: "my_table" });
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("does NOT set fieldName for bracket-accessed columns", () => {
    const refs = scan(`x = $db.my_table["some col"]`);
    expect(refs).to.have.lengthOf(1);
    expect(refs[0]).to.include({ refType: "table", name: "my_table" });
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("captures multiple $db references in one expression", () => {
    const refs = scan(`x = $db.table_a @> $db.table_b.id`);
    expect(refs).to.have.lengthOf(2);
    expect(refs.map((r) => r.name)).to.deep.equal(["table_a", "table_b"]);
    expect(refs[1].fieldName).to.equal("id");
  });

  it("ignores non-db variable chains", () => {
    expect(scan(`x = $obj.id`)).to.be.empty;
    expect(scan(`x = $obj.$key`)).to.be.empty;
  });

  it("ignores a bare $db with no property", () => {
    expect(scan(`x = $db`)).to.be.empty;
  });
});
