import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../parser/parser.js";

describe("reference tracking in __symbolTable", () => {
  it("should track function.run reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("function");
    expect(refs[0].name).to.equal("my_target");
    expect(refs[0].startOffset).to.be.a("number");
  });

  it("should track function.call reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.call "my_target" as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("function");
    expect(refs[0].name).to.equal("my_target");
  });

  it("should track db.get table reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get users {
          field_name = id
          field_value = 1
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].name).to.equal("users");
  });

  it("should track db.query table reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.query users {
          return {
            type = list
          }
        } as $users
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].name).to.equal("users");
  });

  it("should track multiple references in one file", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get users {
          field_name = "user_id"
          field_value = 1
        } as $user
        function.run "helper" as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(2);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].name).to.equal("users");
    expect(refs[1].refType).to.equal("function");
    expect(refs[1].name).to.equal("helper");
  });

  it("should track task.call reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        task.call "my_task" as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("task");
    expect(refs[0].name).to.equal("my_task");
  });

  it("should track db.bulk.delete table reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.bulk.delete users {
          field_name = id
          field_value = [1, 2, 3]
        }
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].name).to.equal("users");
  });

  it("should track string literal table names", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get "user table" {
          field_name = id
          field_value = 1
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].name).to.equal("user table");
  });

  it("should capture input args on function.run reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" {
          input = { user_id: 1, name: "test" }
        } as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("function");
    expect(refs[0].args).to.be.an("object");
    expect(refs[0].args).to.have.property("user_id");
    expect(refs[0].args).to.have.property("name");
  });

  it("should capture literal types on input args", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" {
          input = { count: 100, name: "test", rate: 3.14, active: true }
        } as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    const args = refs[0].args;
    expect(args.count.type).to.equal("int");
    expect(args.name.type).to.equal("text");
    expect(args.rate.type).to.equal("decimal");
    expect(args.active.type).to.equal("bool");
  });

  it("should capture input args with variable values as unknown type", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" {
          input = { user_id: $var1 }
        } as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].args).to.have.property("user_id");
    expect(refs[0].args.user_id.type).to.be.null;
  });

  it("should not have args when function.run has no input", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].args).to.be.undefined;
  });

  it("should not have args when function.run has non-input attributes only", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        function.run "my_target" {
          description = "testing"
        } as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].args).to.be.undefined;
  });

  it("should capture field_name on db.get reference with string literal", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get users {
          field_name = "id"
          field_value = 1
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].fieldName).to.equal("id");
  });

  it("should capture field_name on db.edit reference with string literal", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.edit users {
          field_name = "id"
          field_value = 1
          data = { name: "test" }
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].fieldName).to.equal("id");
  });

  it("should not capture field_name when value is a variable expression", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get users {
          field_name = $input.field
          field_value = 1
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("should not have field_name when db function has no field_name attribute", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.query users {
          return {
            type = list
          }
        } as $users
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].fieldName).to.be.undefined;
  });

  it("should track middleware references from query middleware clause", () => {
    const parser = xanoscriptParser(`query foo verb=GET {
      input {
        text user_id filters=trim
      }

      stack {
      }

      response = null

      middleware = {pre: [{name: "auth_middle"}], post: [{name: "log_middle"}]}
    }`);
    const refs = parser.__symbolTable.references;
    const mwRefs = refs.filter((r) => r.refType === "middleware");
    expect(mwRefs).to.have.length(2);
    expect(mwRefs[0].name).to.equal("auth_middle");
    expect(mwRefs[1].name).to.equal("log_middle");
  });

  it("should track middleware.call reference", () => {
    const parser = xanoscriptParser(`workflow_test test_middleware {
      stack {
        middleware.call "auth_check" {
          input = {
            vars: $input,
            type: "pre"
          }
        } as $result
      }
    }`);
    const refs = parser.__symbolTable.references;
    const mwRefs = refs.filter((r) => r.refType === "middleware");
    expect(mwRefs).to.have.length(1);
    expect(mwRefs[0].name).to.equal("auth_check");
  });

  it("should track data keys on db.edit reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.edit users {
          field_name = "id"
          field_value = 1
          data = { name: "test", email: "foo@bar.com" }
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].refType).to.equal("table");
    expect(refs[0].dataKeys).to.be.an("array");
    const keyNames = refs[0].dataKeys.map((k) => k.name);
    expect(keyNames).to.include("name");
    expect(keyNames).to.include("email");
  });

  it("should not have dataKeys when db function has no data attribute", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.get users {
          field_name = "id"
          field_value = 1
        } as $user
      }
    }`);
    const refs = parser.__symbolTable.references;
    expect(refs).to.have.length(1);
    expect(refs[0].dataKeys).to.be.undefined;
  });

  it("should track join table references in db.query", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.query users {
          join = {
            profile: {
              type: "left"
              table: "user_profiles"
            }
          }
          return = {type: "list"}
        } as $users
      }
    }`);
    const refs = parser.__symbolTable.references;
    const tableRefs = refs.filter((r) => r.refType === "table");
    expect(tableRefs).to.have.length(2);
    expect(tableRefs[0].name).to.equal("users");
    expect(tableRefs[1].name).to.equal("user_profiles");
  });

  it("should track addon name references in db.query", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.query users {
          addon = [{name: "get_posts", as: "_posts"}]
          return = {type: "list"}
        } as $users
      }
    }`);
    const refs = parser.__symbolTable.references;
    const fnRefs = refs.filter((r) => r.refType === "function");
    expect(fnRefs).to.have.length(1);
    expect(fnRefs[0].name).to.equal("get_posts");
  });

  it("should track table relation references from column definitions", () => {
    const parser = xanoscriptParser(`table beer {
      schema {
        int brewery_id {
          table = "brewery"
        }
      }
    }`);
    const refs = parser.__symbolTable.references;
    const tableRefs = refs.filter((r) => r.refType === "table");
    expect(tableRefs).to.have.length(1);
    expect(tableRefs[0].name).to.equal("brewery");
  });

  it("should track function.run with empty name and not leak args to previous reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        db.edit claim {
          field_name = "id"
          field_value = 1
          data = {status: "active"}
        } as $updated_claim

        function.run "" {
          input = {
            claim_id: 1
            to_status: "assessment"
          }
        } as $transition_result
      }
    }`);
    const refs = parser.__symbolTable.references;
    const tableRefs = refs.filter((r) => r.refType === "table");
    const fnRefs = refs.filter((r) => r.refType === "function");

    // The table ref should NOT have args from the function.run
    expect(tableRefs).to.have.length(1);
    expect(tableRefs[0].name).to.equal("claim");
    expect(tableRefs[0].args).to.be.undefined;

    // The function ref should exist (even with empty name) and carry the args
    expect(fnRefs).to.have.length(1);
    expect(fnRefs[0].name).to.equal("");
    expect(fnRefs[0].args).to.have.property("claim_id");
    expect(fnRefs[0].args).to.have.property("to_status");
  });

  it("should track security.create_auth_token table reference", () => {
    const parser = xanoscriptParser(`function "caller" {
      stack {
        security.create_auth_token {
          table = "users"
          extras = {}
          expiration = 86400
          id = ""
        } as $token
      }
    }`);
    const refs = parser.__symbolTable.references;
    const tableRefs = refs.filter((r) => r.refType === "table");
    expect(tableRefs).to.have.length(1);
    expect(tableRefs[0].name).to.equal("users");
  });
});
