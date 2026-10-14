import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("error_trigger", () => {
  it("should parse a basic error_trigger with required clauses", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse error_trigger with string literal name", () => {
    const parser = xanoscriptParser(`error_trigger "sine errors" {
      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should error when missing input clause", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing stack clause", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      input {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when missing a name", () => {
    const parser = xanoscriptParser(`error_trigger {
      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when name is an empty string", () => {
    const parser = xanoscriptParser(`error_trigger "" {
      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should parse description attribute", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      description = "Notify on new and fixed errors"

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse tags attribute", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      tags = ["alerts", "errors"]

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse history clause", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      input {
      }

      stack {
      }

      history = 100
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should error on duplicate input clause", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      input {
      }

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on duplicate stack clause", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      input {
      }

      stack {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on duplicate description attribute", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      description = "First"
      description = "Second"

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on duplicate tags attribute", () => {
    const parser = xanoscriptParser(`error_trigger trigger_on_error {
      tags = ["tag1"]
      tags = ["tag2"]

      input {
      }

      stack {
      }
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should parse the full event-trigger example from the spec", () => {
    const parser = xanoscriptParser(`// Notify on new and fixed errors
error_trigger "sine errors" {
  input {
    // Which event fired the trigger.
    enum event? {
      values = ["new", "regression", "fixed"]
    }

    // The error signature row id.
    int id?

    // Stable hash that identifies this error signature.
    text signature?

    // Error code and message captured from the failing run.
    object error? {
      schema {
        // Machine-readable error code.
        text code?

        // Human-readable error message.
        text message?
      }
    }

    // Where the error originated. Null on 'fixed' events.
    object? caller? {
      schema {
        // Caller kind (api, function, task, middleware, trigger, unknown).
        text type?

        // Caller object id.
        int id?

        // Caller object name.
        text? name?
      }
    }

    // Failing statement. Null on 'fixed' events.
    object? statement? {
      schema {
        // Statement name.
        text name?

        // Statement xsid within the function stack.
        text xsid?
      }
    }

    // User who marked the error as fixed.
    object? actor? {
      schema {
        // User id.
        int id?

        // User name.
        text? name?
      }
    }

    // Occurrence counts for this signature.
    object count? {
      schema {
        // Total occurrences since first seen.
        int total?

        // Occurrences in the last hour.
        int last_hour?
      }
    }

    // ISO-8601 UTC timestamp of the first occurrence.
    text first_seen?

    // ISO-8601 UTC timestamp of the most recent occurrence.
    text last_seen?

    // ISO-8601 UTC timestamp the error was marked fixed. Null otherwise.
    text? fixed_at?
  }

  stack {
    api.request {
      url = "https://example.com/webhook"
      method = "POST"
      params = {
        event  : $input.event
        count  : $input.count
        message: $input.error.message
        error  : $input.error.code
        url    : "http://localhost:4200/workspace/2-0/error-logs/" ~ $input.id
        info   : "from a different branch"
      }

      headers = []
        |push:"Content-Type: application/json"
    } as $api1
  }
}`);

    expect(parser.errors).to.be.empty;
  });
});
