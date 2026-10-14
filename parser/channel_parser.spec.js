import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("channel", () => {
  it("should parse a channel with a middleware block", () => {
    // Container middleware default for this channel's messages — the channel
    // tier of message -> channel -> realtime_server -> branch/workspace.
    // Mirrors api_group, which carries the same block for its queries.
    const parser = xanoscriptParser(`channel g1b {
  realtime_server = "a2"
  access = {anonymous: false, presence: false}
  publish = {who: "nobody", direct: false}
  middleware = {pre: [{name: "auth"}], post: [{name: "audit", active: false}]}
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a channel with a post-only middleware block", () => {
    const parser = xanoscriptParser(`channel g1b {
  realtime_server = "a2"
  middleware = {post: [{name: "sdsfsdfds"}]}
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a simple named channel", () => {
    const parser = xanoscriptParser(`channel lobby {
  realtime_server = "main"
  access = {anonymous: true, presence: true}
  publish = {who: "anyone", direct: false}
  conversation = {active: true, limit: 25, ttl: 3600}
  delivery = {guarantee: "at_most_once", per_recipient: false}
  rate_limit = {messages_per_minute: 60}
  history = 100
  guid = "chan-1"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a parameterized channel with a typed input block", () => {
    const parser = xanoscriptParser(`channel "rooms/{room_id}" {
  realtime_server = "main"
  input { int room_id }
  access = {anonymous: false, presence: true}
  publish = {who: "authenticated", direct: true}
  conversation = {active: true, limit: 50, ttl: 86400}
  delivery = {guarantee: "at_least_once", per_recipient: false}
  rate_limit = {messages_per_minute: 60}
  history = false
  guid = "chan-2"
}`);

    expect(parser.errors).to.be.empty;
  });

  // The backend emits `history` as any user-set message
  // limit, not a fixed preset — a non-enum value like 50 must parse clean.
  it("should parse a channel with a non-enum history limit", () => {
    const parser = xanoscriptParser(`channel "rooms/{room_id}" {
  realtime_server = "main"
  history = 50
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a minimal channel (server only)", () => {
    const parser = xanoscriptParser(`channel lobby {
      realtime_server = "main"
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should error when missing realtime_server clause", () => {
    const parser = xanoscriptParser(`channel lobby {
      access = {anonymous: true, presence: true}
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on an invalid publish.who enum value", () => {
    const parser = xanoscriptParser(`channel lobby {
      realtime_server = "main"
      publish = {who: "everybody", direct: false}
    }`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should parse a channel with active = false at the top level", () => {
    const parser = xanoscriptParser(`channel lobby {
      realtime_server = "main"
      active = false
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a channel with active = true at the top level", () => {
    const parser = xanoscriptParser(`channel lobby {
      realtime_server = "main"
      active = true
    }`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a channel carrying active alongside all other clauses (the reported case)", () => {
    const parser = xanoscriptParser(`channel lobby {
  realtime_server = "main"
  active = false
  access = {anonymous: true, presence: true}
  publish = {who: "anyone", direct: false}
  conversation = {active: true, limit: 25, ttl: 3600}
  delivery = {guarantee: "at_most_once", per_recipient: false}
  rate_limit = {messages_per_minute: 60}
  history = 100
  guid = "chan-1"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should error on a non-boolean active value", () => {
    const parser = xanoscriptParser(`channel lobby {
      realtime_server = "main"
      active = "yes"
    }`);

    expect(parser.errors).to.not.be.empty;
  });
});
