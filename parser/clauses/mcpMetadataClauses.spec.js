import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../parser.js";
import { iconSrcProblem } from "./mcpMetadataClauses.js";

const tool = (body) =>
  xanoscriptParser(`tool t {
${body}
  input {
  }

  stack {
  }

  response = null
}`);

const messages = (parser) => parser.errors.map((e) => e.message);

describe("iconSrcProblem", () => {
  it("accepts https and png/jpeg/webp data URIs", () => {
    expect(iconSrcProblem("https://cdn.example.com/a.png")).to.equal(null);
    expect(iconSrcProblem("data:image/png;base64,iVBORw0KGgo=")).to.equal(null);
    expect(iconSrcProblem("data:image/webp;base64,UklGRg==")).to.equal(null);
  });

  it("refuses javascript:, http: and file:", () => {
    expect(iconSrcProblem("javascript:alert(1)")).to.include("javascript:");
    expect(iconSrcProblem("http://x.com/a.png")).to.include("http:");
    expect(iconSrcProblem("file:///etc/passwd")).to.include("file:");
  });

  it("refuses an svg data URI", () => {
    expect(iconSrcProblem("data:image/svg+xml;base64,PHN2Zz4=")).to.include(
      "image/svg+xml",
    );
  });

  it("refuses a non-base64 data URI", () => {
    expect(iconSrcProblem("data:image/png,raw")).to.include("base64");
  });

  it("refuses an oversized data URI", () => {
    const payload = "A".repeat(90000);
    expect(iconSrcProblem(`data:image/png;base64,${payload}`)).to.include(
      "larger than",
    );
  });

  it("refuses an https URL with no host", () => {
    expect(iconSrcProblem("https://")).to.include("not a valid https URL");
  });
});

describe("mcp metadata clauses", () => {
  it("parses title, annotations, icons and output on a tool", () => {
    const parser = xanoscriptParser(`tool tool_mcp_metadata {
  title = "Look up an order"
  annotations = {
    read_only_hint  : true
    destructive_hint: false
    idempotent_hint : true
    open_world_hint : false
  }

  icons = [
    {
      src  : "https://cdn.example.com/icons/order.webp"
      sizes: ["any"]
      theme: "light"
    }
    {
      src      : "data:image/webp;base64,UklGRhYAAABXRUJQVlA4IAoAAAAQAgCdASoBAAEAAQA0JaQAA3AA/vuUAAA="
      mime_type: "image/webp"
    }
  ]

  input {
    int order_id
  }

  stack {
    var $order {
      value = {id: $input.order_id, status: "open"}
    }
  }

  response = $order

  output {
    int id
    enum status {
      values = ["open", "closed"]
    }
  }
}`);
    expect(parser.errors).to.be.empty;
  });

  it("diagnoses an unknown annotation key", () => {
    const parser = tool(`  annotations = {sneaky: false}`);
    expect(messages(parser)).to.include(
      "The key 'sneaky' is not valid in this context",
    );
  });

  it("diagnoses an unknown icon key", () => {
    const parser = tool(`  icons = [{src: "https://x.com/a.png", color: "red"}]`);
    expect(messages(parser)).to.include(
      "The key 'color' is not valid in this context",
    );
  });

  it("diagnoses a non-https icon src", () => {
    const parser = tool(`  icons = [{src: "javascript:alert(1)"}]`);
    expect(messages(parser)).to.include(
      'icon src must be https: or a data: image — got "javascript:"',
    );
  });

  it("diagnoses an svg data icon", () => {
    const parser = tool(`  icons = [{src: "data:image/svg+xml;base64,PHN2Zz4="}]`);
    expect(messages(parser).some((m) => m.includes("image/svg+xml"))).to.be
      .true;
  });

  it("diagnoses a bad size, theme and mime_type", () => {
    const parser = tool(
      `  icons = [{src: "https://x.com/a.png", sizes: ["big"], theme: "blue", mime_type: "image/gif"}]`,
    );
    const errors = messages(parser);
    expect(errors).to.include('icon size must be WxH or "any" — got "big"');
    expect(errors.some((m) => m.includes("light"))).to.be.true;
    expect(errors.some((m) => m.includes("image/png"))).to.be.true;
  });

  it("accepts an icon mime_type in any case, or empty", () => {
    const parser = tool(
      `  icons = [{src: "https://x.com/a.png", mime_type: "image/PNG"}, {src: "https://x.com/b.png", mime_type: ""}]`,
    );
    expect(parser.errors).to.be.empty;
  });

  it("checks single-quoted and multiline icon values too", () => {
    const parser = tool(
      `  icons = [{src: 'javascript:alert(1)', sizes: ['big'], mime_type: 'image/gif'}, {src: """
    http://x.com/a.png
    """}]`,
    );
    const errors = messages(parser);
    expect(errors).to.include('icon src must be https: or a data: image — got "javascript:"');
    expect(errors).to.include('icon size must be WxH or "any" — got "big"');
    expect(errors).to.include(
      'icon mime_type must be one of image/png, image/jpeg, image/webp — got "image/gif"',
    );
    expect(errors).to.include('icon src must be https: or a data: image — got "http:"');
  });

  it("diagnoses an empty title", () => {
    const parser = tool(`  title = ""`);
    expect(messages(parser)).to.include("title cannot be empty");
  });

  it("diagnoses a duplicate title", () => {
    const parser = tool(`  title = "a"\n  title = "b"`);
    expect(parser.errors).to.not.be.empty;
  });
});
