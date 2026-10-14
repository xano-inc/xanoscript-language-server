import { expect } from "chai";
import { describe, it } from "mocha";
import {
  parseResourceUri,
  resourceInputProblem,
} from "./mcp_primitive_parser.js";
import { xanoscriptParser } from "./parser.js";

const messages = (parser) => parser.errors.map((e) => e.message);

describe("prompt_parser", () => {
  it("should parse a bare prompt", () => {
    const parser = xanoscriptParser(`prompt bare_prompt {
  input {
  }

  stack {
  }

  response = "Hello"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a prompt with every block", () => {
    const parser = xanoscriptParser(`// Review a code change
prompt code_review {
  title = "Code review"
  icons = [
    {
      src      : "https://cdn.example.com/icons/review.png"
      mime_type: "image/png"
      sizes    : ["48x48"]
      theme    : "light"
    }
  ]

  input {
    // The code to review
    text code

    enum language? {
      values = ["php", "typescript"]
    }
  }

  stack {
    var $messages {
      value = [
        {role: "user", content: "Review this code: " ~ $input.code}
      ]
    }
  }

  response = $messages
  docs = "internal docs"
  tags = ["mcp", "review"]
  history = 1000
  middleware = {pre: [{name: "middleware-book"}]}
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should require an input clause", () => {
    const parser = xanoscriptParser(`prompt p {
  stack {
  }
}`);
    expect(messages(parser)).to.include("prompt p is missing an input clause");
  });

  it("should require a stack clause", () => {
    const parser = xanoscriptParser(`prompt p {
  input {
  }
}`);
    expect(messages(parser)).to.include("prompt p is missing a stack clause");
  });

  it("should refuse resource-only keys", () => {
    const parser = xanoscriptParser(`prompt p {
  uri = "docs://x"
  input {
  }

  stack {
  }
}`);
    expect(parser.errors).to.not.be.empty;
  });
});

describe("resource_parser", () => {
  it("should parse a static resource", () => {
    const parser = xanoscriptParser(`resource readme {
  uri = "docs://readme"
  mime_type = "text/markdown"

  stack {
  }

  response = "# Readme"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a template resource with every block", () => {
    const parser = xanoscriptParser(`// One order in a region
resource regional_order {
  title = "Regional order"
  uri = "orders://{region}/{order_id}"
  mime_type = "application/json"
  annotations = {
    audience     : ["user", "assistant"]
    priority     : 0.5
    last_modified: "2025-01-12T15:00:58Z"
  }

  icons = [
    {
      src      : "https://cdn.example.com/icons/order.png"
      mime_type: "image/png"
    }
  ]

  input {
    enum region {
      values = ["us", "eu"]
    }

    int order_id
  }

  stack {
    var $order {
      value = {region: $input.region, id: $input.order_id}
    }
  }

  response = $order
  tags = ["mcp"]
  history = 1000
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should require a uri", () => {
    const parser = xanoscriptParser(`resource r {
  stack {
  }
}`);
    expect(messages(parser)).to.include("resource r is missing a uri");
  });

  it("should diagnose a template variable missing from input", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{region}/{id}"
  input {
    text region
  }

  stack {
  }
}`);
    expect(messages(parser)).to.include(
      'resource uri variable "id" must be declared in the input block',
    );
  });

  it("should diagnose an input on a static resource", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
  input {
    text extra
  }

  stack {
  }
}`);
    expect(messages(parser)).to.include(
      'input "extra" cannot be set: a static resource has no inputs (use a {extra} uri template)',
    );
  });

  it("should diagnose a list variable", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{ids}"
  input {
    int[] ids
  }

  stack {
  }
}`);
    expect(messages(parser)).to.include(
      'resource uri variable "ids" must be a single value, not a list',
    );
  });

  it("should name the object input, not its nested fields", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{id}"
  input {
    int id
    object filter {
      schema {
        text status
      }
    }
  }

  stack {
  }
}`);
    expect(messages(parser)).to.deep.equal([
      'input "filter" is not a variable of the resource uri',
    ]);
  });

  it("should refuse an object uri variable", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{filter}"
  input {
    object filter {
      schema {
        text status
      }
    }
  }

  stack {
  }
}`);
    expect(messages(parser).some((m) => m.includes('got "object"'))).to.be.true;
  });

  it("should accept an enum uri variable", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{region}"
  input {
    enum region {
      values = ["eu", "us"]
    }
  }

  stack {
  }
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should diagnose an invalid uri variable name", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "orders://{order-id}"
  stack {
  }
}`);
    expect(messages(parser)).to.include(
      'resource uri variable "order-id" must be letters, digits and _',
    );
  });

  it("should require a stack clause", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
}`);
    expect(messages(parser)).to.include("resource r is missing a stack clause");
  });

  it("should diagnose a bad mime_type", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
  mime_type = "not a mime"
  stack {
  }
}`);
    expect(messages(parser)).to.include(
      'resource mime_type must be a MIME type such as text/markdown — got "not a mime"',
    );
  });

  it("should diagnose bad annotations", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
  annotations = {audience: ["robot"], priority: 2, last_modified: "yesterday"}
  stack {
  }
}`);
    const errors = messages(parser);
    expect(errors).to.include(
      'resource annotation audience must be user or assistant — got "robot"',
    );
    expect(errors).to.include(
      "resource annotation priority must be from 0 to 1 — got 2",
    );
    expect(errors.some((e) => e.includes("last_modified"))).to.be.true;
  });

  it("should diagnose single-quoted annotation values", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
  annotations = {audience: ['robot'], last_modified: 'yesterday'}
  stack {
  }
}`);
    const errors = messages(parser);
    expect(errors).to.include(
      'resource annotation audience must be user or assistant — got "robot"',
    );
    expect(errors.some((e) => e.includes("last_modified"))).to.be.true;
  });

  it("should refuse an unknown annotation key", () => {
    const parser = xanoscriptParser(`resource r {
  uri = "docs://readme"
  annotations = {read_only_hint: true}
  stack {
  }
}`);
    expect(messages(parser)).to.include(
      "The key 'read_only_hint' is not valid in this context",
    );
  });
});

describe("parseResourceUri", () => {
  it("accepts a literal uri", () => {
    expect(parseResourceUri("docs://readme")).to.deep.equal({
      problem: null,
      variables: [],
    });
  });

  it("returns template variables in order", () => {
    expect(parseResourceUri("orders://{region}/{order_id}").variables).to.deep.equal(
      ["region", "order_id"],
    );
  });

  it("refuses a missing scheme", () => {
    expect(parseResourceUri("readme").problem).to.include("must start with a scheme");
  });

  it("refuses whitespace", () => {
    expect(parseResourceUri("docs://a b").problem).to.include("whitespace");
  });

  it("refuses level-2+ templates", () => {
    expect(parseResourceUri("docs://{+path}").problem).to.include("operator");
    expect(parseResourceUri("docs://{a,b}").problem).to.include("several variables");
    expect(parseResourceUri("docs://{a*}").problem).to.include("modifier");
  });

  it("refuses broken braces", () => {
    expect(parseResourceUri("docs://{a").problem).to.include("unclosed");
    expect(parseResourceUri("docs://a}").problem).to.include("no matching");
    expect(parseResourceUri("docs://{}").problem).to.include("empty");
  });

  it("refuses repeated and adjacent variables", () => {
    expect(parseResourceUri("docs://{a}/{a}").problem).to.include("more than once");
    expect(parseResourceUri("docs://{a}{b}").problem).to.include("adjacent");
  });
});

describe("resourceInputProblem", () => {
  it("accepts a matching set", () => {
    expect(
      resourceInputProblem(["id"], { id: { type: "int", iterable: false } }),
    ).to.equal(null);
  });

  it("refuses a variable type outside the bindable set", () => {
    expect(
      resourceInputProblem(["f"], { f: { type: "file", iterable: false } }),
    ).to.include("must be one of");
  });

  it("refuses an input no variable supplies", () => {
    expect(
      resourceInputProblem(["a"], {
        a: { type: "text", iterable: false },
        b: { type: "text", iterable: false },
      }),
    ).to.equal('input "b" is not a variable of the resource uri');
  });
});
