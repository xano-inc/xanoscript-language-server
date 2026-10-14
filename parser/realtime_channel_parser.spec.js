import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("realtime_channel", () => {
  it("should parse a complete realtime_channel with all clauses", () => {
    const parser = xanoscriptParser(`realtime_channel "some-channel" {
      public_messaging = {active: false}
      private_messaging = {active: false}
      settings = {
        anonymous_clients: false
        nested_channels  : false
        message_history  : 0
        auth_channel     : false
        presence         : false
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  // `xano workspace pull` emits `message_history: history ?? 0` — an
  // arbitrary integer, not one of
  // the old fixed enum values `[0, 25, 50, 100, 250, 1000]`. A pulled channel with
  // a history like 10 previously false-positived in the editor. This asserts the
  // full maximal pulled shape (description/active/public+private messaging/settings)
  // now parses clean; it fails against the pre-fix enum grammar.
  it("should parse a pulled realtime_channel with a non-enum message_history", () => {
    const parser = xanoscriptParser(`realtime_channel "rooms/{room_id}" {
      description = "Room channel"
      active = false
      public_messaging = {active: false}
      private_messaging = {active: false}
      settings = {
        anonymous_clients: false
        nested_channels  : false
        message_history  : 10
        auth_channel     : false
        presence         : false
      }
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should still parse each canonical enum message_history value", () => {
    for (const history of [0, 25, 50, 100, 250, 1000]) {
      const parser = xanoscriptParser(`realtime_channel "c" {
        settings = {
          anonymous_clients: false
          nested_channels  : false
          message_history  : ${history}
          auth_channel     : false
          presence         : false
        }
      }`);
      expect(parser.errors, `message_history = ${history}`).to.be.empty;
    }
  });

  // The widening is accept-only, not fail-silent: a non-numeric message_history
  // must still surface a diagnostic (acceptance criterion #4).
  it("should error on a non-numeric message_history value", () => {
    const parser = xanoscriptParser(`realtime_channel "c" {
      settings = {
        anonymous_clients: false
        nested_channels  : false
        message_history  : "yes"
        auth_channel     : false
        presence         : false
      }
    }`);
    expect(parser.errors).to.not.be.empty;
  });
});
