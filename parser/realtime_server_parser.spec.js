import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("realtime_server", () => {
  it("should parse a realtime_server with a middleware block", () => {
    // Middleware default for every message on this server — the
    // realtime_server tier of the message middleware chain.
    const parser = xanoscriptParser(`realtime_server chat {
  canonical = "svc123"
  middleware = {pre: [{name: "auth"}], post: []}
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse the minimal real push/pull shape (canonical + guid)", () => {
    const parser = xanoscriptParser(`realtime_server main {
  canonical = "rtmain01"
  guid = "BWHO-zct9DMCzAGyYnLqaGFtox8"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse the exact settings-panel screenshot case (canonical only)", () => {
    const parser = xanoscriptParser(`realtime_server main {
  canonical = "rtmain01"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse an empty body (all fields optional)", () => {
    const parser = xanoscriptParser(`realtime_server main {}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a fuller server with description/active/history/tags/docs", () => {
    const parser = xanoscriptParser(`realtime_server main {
  canonical = "rtmain01"
  description = "Primary realtime server"
  active = true
  guid = "BWHO-zct9DMCzAGyYnLqaGFtox8"
  tags = ["realtime", "primary"]
  docs = "Some docs for the server"
  history = 100
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should accept an arbitrary non-magic history limit", () => {
    // the backend emits `history` as any user-set message limit, so a valid
    // server whose limit is not one of the old magic numbers (e.g. 50, 250)
    // must NOT raise a false-positive diagnostic
    let parser = xanoscriptParser(`realtime_server main {
  canonical = "rtmain01"
  history = 50
}`);
    expect(parser.errors).to.be.empty;

    parser = xanoscriptParser(`realtime_server main {
  canonical = "rtmain01"
  history = 250
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a name that EXTENDS the realtime_server keyword", () => {
    // `realtime_server_0` is the frontend's default scaffold name. Its prefix is
    // the `realtime_server` keyword, so without Identifier in the token's
    // longer_alt the lexer split it into keyword + `_0` and the parser reported
    // `Expecting { but found '_0'`.
    let parser = xanoscriptParser(`realtime_server realtime_server_0 {
  description = ""
  active = true
}`);
    expect(parser.errors).to.be.empty;

    // and a longer keyword-prefixed name still tokenizes as one identifier
    parser = xanoscriptParser(`realtime_server realtime_server_primary {
  canonical = "rtmain01"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a string-literal declaration name", () => {
    const parser = xanoscriptParser(`realtime_server "My Server" {
  canonical = "rtmain01"
}`);
    expect(parser.errors).to.be.empty;
  });

  it("should still parse a realtime_server_trigger (no keyword collision)", () => {
    const parser = xanoscriptParser(`realtime_server_trigger main_connect {
  realtime_server = "main"
  input {
    enum action {
      values = ["connect", "disconnect"]
    }
    text channel
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
});
