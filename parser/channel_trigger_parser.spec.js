import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("channel_trigger", () => {
  it("should parse the real push/pull shape", () => {
    const parser = xanoscriptParser(`channel_trigger rooms_join {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  input {
    enum action {
      values = ["join", "leave"]
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
  actions = {join: true}
  guid = "abc-123"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a deliver action (per-recipient delivery trigger)", () => {
    const parser = xanoscriptParser(`channel_trigger secret_deliver {
      realtime_server = "main"
      channel = "secret"

      input {
        enum action {
          values = ["join", "leave", "deliver"]
        }
        text channel
      }

      stack {
        var $out {
          value = {text: $input.text}
        }
      }

      response = $out
      actions = {deliver: true}
      guid = "abc-456"
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse with an identifier name", () => {
    const parser = xanoscriptParser(`channel_trigger foo {
      realtime_server = "main"
      channel = "lobby"
      actions = {leave: true}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse both join and leave actions", () => {
    const parser = xanoscriptParser(`channel_trigger foo {
      realtime_server = "main"
      channel = "lobby"
      actions = {join: true, leave: false}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should error when missing realtime_server clause", () => {
    const parser = xanoscriptParser(`channel_trigger foo {
      channel = "lobby"
      actions = {join: true}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing channel clause", () => {
    const parser = xanoscriptParser(`channel_trigger foo {
      realtime_server = "main"
      actions = {join: true}

      input {
      }

      stack {
      }

      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing response clause", () => {
    const parser = xanoscriptParser(`channel_trigger foo {
      realtime_server = "main"
      channel = "lobby"
      actions = {join: true}

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });
});
