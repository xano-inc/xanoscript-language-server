import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("realtime_server_trigger", () => {
  it("should parse the real push/pull shape", () => {
    const parser = xanoscriptParser(`realtime_server_trigger main_connect {
  realtime_server = "main"
  input {
    enum action {
      values = ["connect", "disconnect"]
    }
    text channel
    object client {
      schema {
        json extras
        object permissions {
          schema {
            int dbo_id
            text row_id
          }
        }
      }
    }
  }
  stack {
    var $decision {
      value = {allowed: true}
    }
  }
  response = $decision
  actions = {connect: true}
  guid = "def-456"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse with an identifier name", () => {
    const parser = xanoscriptParser(`realtime_server_trigger foo {
      realtime_server = "main"
      actions = {disconnect: true}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse both connect and disconnect actions", () => {
    const parser = xanoscriptParser(`realtime_server_trigger foo {
      realtime_server = "main"
      actions = {connect: true, disconnect: false}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should error when missing realtime_server clause", () => {
    const parser = xanoscriptParser(`realtime_server_trigger foo {
      actions = {connect: true}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing stack clause", () => {
    const parser = xanoscriptParser(`realtime_server_trigger foo {
      realtime_server = "main"
      actions = {connect: true}

      input {
      }

      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });
});
