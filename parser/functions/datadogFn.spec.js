import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../lexer/lexer.js";
import { xanoscriptParser } from "../parser.js";
import { parser } from "../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.datadogFn();
  return parser;
}

describe("datadogFn", () => {
  it("parses datadog.log", () => {
    const parser = parse(`datadog.log {
      message = "hi"
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("parses datadog.log_bulk", () => {
    const parser = parse(`datadog.log_bulk {
      entries = $entries
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("parses datadog.metric", () => {
    const parser = parse(`datadog.metric {
      metric = "requests.count"
      value = 1
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("parses datadog.metric_bulk", () => {
    const parser = parse(`datadog.metric_bulk {
      entries = $entries
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("parses datadog statements inside a query stack", () => {
    const parser = xanoscriptParser(`query test verb=GET {
      input {}
      stack {
        datadog.log {
          message = "hi"
        }
        datadog.log_bulk {
          entries = $entries
        }
        datadog.metric {
          metric = "requests.count"
          value = 1
        }
        datadog.metric_bulk {
          entries = $entries
        }
      }
      response = "ok"
    }`);
    expect(parser.errors).to.be.empty;
  });
});
