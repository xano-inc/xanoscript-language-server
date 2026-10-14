import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../../parser.js";

const inTool = (stack) =>
  xanoscriptParser(`tool t {
  input {
    int id
  }

  stack {
${stack}
  }

  response = null
}`);

const messages = (parser) => parser.errors.map((e) => e.message);
const warnings = (parser) => parser.warnings.map((w) => w.message);
const WRITE_WARNING = "runs before this mcp.elicit";

describe("mcp.elicit", () => {
  it("parses key, message, input and as", () => {
    const parser = inTool(`    mcp.elicit {
      key = "confirm"
      message = "Delete " ~ $input.id ~ "?"
      input {
        // Go ahead
        bool proceed

        enum color?=red {
          values = ["red", "green"]
        }

        int count? filters=min:1|max:5
        text reason? filters=max:200
      }
    } as $answer`);
    expect(parser.errors).to.be.empty;
    expect(parser.warnings).to.be.empty;
  });

  it("parses without input or as", () => {
    const parser = inTool(`    mcp.elicit {
      key = "confirm"
      message = "Go?"
      description = "ask"
      disabled = false
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("requires key and message", () => {
    const parser = inTool(`    mcp.elicit {
      description = "nothing"
    }`);
    const errors = messages(parser);
    expect(errors.some((m) => m.includes("key"))).to.be.true;
    expect(errors.some((m) => m.includes("message"))).to.be.true;
  });

  it("diagnoses an unknown attribute", () => {
    const parser = inTool(`    mcp.elicit {
      key = "k"
      message = "m"
      schema = 1
    }`);
    expect(messages(parser).some((m) => m.includes("`schema` is not allowed"))).to
      .be.true;
  });

  it("diagnoses a duplicate attribute", () => {
    const parser = inTool(`    mcp.elicit {
      key = "a"
      message = "m"
      key = "b"
    }`);
    expect(messages(parser)).to.include("Duplicate attribute `key`");
  });

  it("does not register form fields as document inputs", () => {
    const parser = inTool(`    mcp.elicit {
      key = "k"
      message = "m"
      input {
        bool proceed
      }
    } as $answer`);
    expect(parser.__symbolTable.input).to.have.key("id");
  });
});

describe("write-before-elicit lint", () => {
  it("warns when db.add precedes the elicit", () => {
    const parser = inTool(`    db.add order {
      data = {id: $input.id}
    } as $row

    mcp.elicit {
      key = "k"
      message = "m"
    } as $answer`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.add` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("does not warn when the elicit precedes db.add", () => {
    const parser = inTool(`    mcp.elicit {
      key = "k"
      message = "m"
    } as $answer

    db.add order {
      data = {id: $input.id}
    } as $row`);
    expect(warnings(parser).some((m) => m.includes(WRITE_WARNING))).to.be.false;
  });

  it("warns for a write nested in an earlier conditional", () => {
    const parser = inTool(`    conditional {
      if ($input.id > 0) {
        db.del order {
          field_name = "id"
          field_value = $input.id
        }
      }
    }

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(parser).some((m) => m.includes("`db.del` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for a non-GET api.request but not a GET one", () => {
    const post = inTool(`    api.request {
      url = "https://x.com"
      method = "post"
    } as $r

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(post).some((m) => m.includes("`api.request` " + WRITE_WARNING)))
      .to.be.true;

    const get = inTool(`    api.request {
      url = "https://x.com"
      method = "GET"
    } as $r

    api.request {
      url = "https://x.com"
    } as $r2

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(get).some((m) => m.includes(WRITE_WARNING))).to.be.false;
  });

  it("warns for function.run", () => {
    const parser = inTool(`    function.run "do_it" as $x

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(parser).some((m) => m.includes("`function.run` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns once, on the first elicit only", () => {
    const parser = inTool(`    db.add order {
      data = {id: $input.id}
    } as $row

    mcp.elicit {
      key = "a"
      message = "m"
    }

    mcp.elicit {
      key = "b"
      message = "m"
    }`);
    expect(warnings(parser).filter((m) => m.includes(WRITE_WARNING))).to.have
      .length(1);
  });

  it("warns for a write between two elicits", () => {
    const parser = inTool(`    mcp.elicit {
      key = "a"
      message = "m"
    }

    db.edit order {
      field_name = "id"
      field_value = $input.id
      data = {status: "x"}
    } as $row

    mcp.elicit {
      key = "b"
      message = "m"
    }`);
    const hits = warnings(parser).filter((m) => m.includes(WRITE_WARNING));
    expect(hits).to.have.length(1);
    expect(hits[0]).to.include("`db.edit`");
  });

  it("warns for raw SQL before the elicit", () => {
    const parser = inTool(`    db.direct_query {
      sql = "DELETE FROM orders"
      response_type = "list"
    } as $x

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(parser).some((m) => m.includes("`db.direct_query` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for db.patch", () => {
    const parser = inTool(`    db.patch order {
      field_name = "id"
      field_value = $input.id
      data = {status: "x"}
    } as $row

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.patch` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for db.truncate", () => {
    const parser = inTool(`    db.truncate order {
      reset = true
    }

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.truncate` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for db.increment", () => {
    const parser = inTool(`    db.increment order {
      where = $db.order.id == $input.id
      field_name = "count"
      value = 1
    }

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.increment` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for db.add_or_edit", () => {
    const parser = inTool(`    db.add_or_edit order {
      field_name = "id"
      field_value = $input.id
      data = {status: "x"}
    } as $row

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.add_or_edit` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("warns for db.bulk", () => {
    const parser = inTool(`    db.bulk.add order {
      items = [{status: "x"}]
    } as $rows

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`db.bulk` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("reads the api.request method attribute, not a nested method key", () => {
    const parser = inTool(`    api.request {
      url = "https://x.com"
      params = {method: "GET"}
      method = "POST"
    } as $r

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(parser.errors).to.be.empty;
    expect(warnings(parser).some((m) => m.includes("`api.request` " + WRITE_WARNING)))
      .to.be.true;
  });

  it("treats a filtered method as a possible write", () => {
    const parser = inTool(`    api.request {
      url = "https://x.com"
      method = "GET"|to_upper
    } as $r

    mcp.elicit {
      key = "k"
      message = "m"
    }`);
    expect(warnings(parser).some((m) => m.includes("`api.request` " + WRITE_WARNING)))
      .to.be.true;
  });
});

