import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("message", () => {
  it("should parse the real push/pull shape with middleware", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "lobby"
  deliver_to = "channel"
  input {
    text text filters=trim|min:1|max:500
  }
  stack {
    debug.log {
      value = "hi"
    }
    var $out {
      value = {text: "hello", at: now}
    }
  }
  response = $out
  middleware = {pre: [{name: "rt_audit"}], post: [{name: "rt_audit"}]}
  guid = "msg-1"
}`);

    expect(parser.errors).to.be.empty;
  });

  // A valid Realtime message declaration must report zero diagnostics.
  // Representative fuller shape (auth + input + stack + response + history + guid).
  it("should parse a representative valid message with zero diagnostics", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  auth = "user"
  deliver_to = "channel"
  input {
    text text filters=trim|min:1|max:500
  }
  stack {
    var $out {
      value = {text: "hello", at: now}
    }
  }
  response = $out
  history = 10
  guid = "msg-1"
}`);

    expect(parser.errors).to.be.empty;
  });

  // The backend emits `docs = "..."`
  // for a documented message and `active = false` for a disabled one; both must
  // parse clean (previously they bailed the parser and cascaded into spurious
  // "missing input/stack/response" errors on an otherwise-valid file).
  it("should parse a message carrying a docs clause with zero diagnostics", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  deliver_to = "channel"
  docs = "Broadcasts a chat message to the room."
  input {
    text text filters=trim
  }
  stack {
    var $out {
      value = {text: "hi"}
    }
  }
  response = $out
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a disabled message (active = false) with zero diagnostics", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  deliver_to = "channel"
  active = false
  docs = "Docs and active together, as the transform round-trips them."
  input {
    text text filters=trim
  }
  stack {
    var $out {
      value = {text: "hi"}
    }
  }
  response = $out
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should still error on a non-boolean active value (not fail-silent)", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  deliver_to = "channel"
  active = "nope"
  input {
    text text filters=trim
  }
  stack {
    var $out {
      value = {text: "hi"}
    }
  }
  response = $out
}`);

    expect(parser.errors).to.not.be.empty;
  });

  // The backend emits `history` as any user-set message
  // limit (Transform::onSchemaRequestHistory), not a fixed preset set. A
  // non-enum value like 50 must parse clean on a message; a non-numeric,
  // non-sentinel value must still error.
  it("should parse a message with a non-enum history limit", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  deliver_to = "channel"
  history = 50
  input {
    text text filters=trim
  }
  stack {
    var $out {
      value = {text: "hi"}
    }
  }
  response = $out
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should still error on a non-numeric, non-sentinel history value", () => {
    const parser = xanoscriptParser(`message say {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  deliver_to = "channel"
  history = "yes"
  input {
    text text filters=trim
  }
  stack {
    var $out {
      value = {text: "hi"}
    }
  }
  response = $out
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should parse a message with an auth clause", () => {
    const parser = xanoscriptParser(`message post {
  realtime_server = "main"
  channel = "rooms/{room_id}"
  auth = "user"
  deliver_to = "channel"
  input {
    text body filters=trim|min:1|max:2000
  }
  stack {
    var $out {
      value = {ok: true}
    }
  }
  response = $out
  guid = "msg-2"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse each deliver_to enum value", () => {
    for (const target of ["channel", "sender", "others", "explicit"]) {
      const parser = xanoscriptParser(`message say {
        realtime_server = "main"
        channel = "lobby"
        deliver_to = "${target}"
        input {
        }
        stack {
        }
        response = null
      }`);

      expect(parser.errors, `deliver_to = "${target}"`).to.be.empty;
    }
  });

  it("should error on an invalid deliver_to value", () => {
    const parser = xanoscriptParser(`message say {
      realtime_server = "main"
      channel = "lobby"
      deliver_to = "everyone"
      input {
      }
      stack {
      }
      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing realtime_server clause", () => {
    const parser = xanoscriptParser(`message say {
      channel = "lobby"
      deliver_to = "channel"
      input {
      }
      stack {
      }
      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing channel clause", () => {
    const parser = xanoscriptParser(`message say {
      realtime_server = "main"
      deliver_to = "channel"
      input {
      }
      stack {
      }
      response = null
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should parse a message with no response clause (response is optional)", () => {
    const parser = xanoscriptParser(`message say {
      realtime_server = "main"
      channel = "lobby"
      deliver_to = "channel"
      input {
      }
      stack {
      }
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a config-only message scaffold (no input/stack/response)", () => {
    // A realtime v2 message is created config-only by design — its Stack is
    // generated server-side after save — so a scaffold carrying only
    // realtime_server/channel/deliver_to/description/history and NONE of
    // input/stack/response must be diagnostic-clean.
    const parser = xanoscriptParser(`message say {
      realtime_server = "main"
      channel = "rooms/{room_id}"
      deliver_to = "channel"
      description = "Config-only message scaffold"
      history = 100
    }`);

    expect(parser.errors).to.be.empty;
  });
});
