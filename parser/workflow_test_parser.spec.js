import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("workflow_test_parser", () => {
  it("should parse a basic workflow test with expect", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        var $a {
          value = 22
        }
        var $b {
          value = $a + 20
        }

        expect.to_equal ($b) {
          value = 42
        }
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should be able to call an addon function in a workflow test", () => {
    const parser = xanoscriptParser(`workflow_test test {
      stack {
        addon.call "" {
          input = {ids: []|push:1|push:2}
        } as $addon1
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a workflow test with a function test call", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        function.call add {
          input = {a: 5, b: 10}
        } as $sums
      
        expect.to_equal ($sum
          |subtract:5
        ) {
          value = 10
        }
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a workflow test with a task test call", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        task.call "count to 10" as $test1
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a workflow test with an api call", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        api.call sum verb=GET {
          api_group = "new api"
          headers = ""
          input = {a: 22, b: 33}
        } as $sum
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a workflow test with api.call within a group", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        group {
          stack {
            api.call "endpoint/{id}" verb=PATCH {
              api_group = "external"
              input = {
                data: {action: "update"}
                id: 123
              }
            } as $result
          }
        }
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a workflow test with expect.to_equal within a group", () => {
    const parser = xanoscriptParser(`workflow_test foo {
      stack {
        var $a {
          value = 42
        }

        function.run woot {
          input = {scope: 12}
        } as $my_val

        group {
          stack {
            function.call "add" {
              input = {a: 20, b: 22}
            } as $sum

            expect.to_equal ($a) {
              value = 42
            }
          }
        }

        group {
          stack {
            function.call "add" {
              input = {a: 20, b: 22}
            } as $sum
             
            api.call "users/{user_id}" verb=GET {
              api_group = "account"
              input = { user_id: 123 }
            } as $user

            expect.to_equal ($a) {
              value = 42
            }
          }
        }
      }
    }`);
    expect(parser.errors).to.be.empty;
  });
});
