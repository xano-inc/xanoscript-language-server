import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("run", () => {
  it("should parse a basic run.job", () => {
    const parser = xanoscriptParser(`run.job "Average of values" {
      main = {name: "avg_value"}
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a basic run.job with inputs", () => {
    const parser = xanoscriptParser(`run.job "Average of values" {
      main = {name: "avg_value", input: {left: 1, right: 2}}
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("run.job requires a main attribute", () => {
    let parser = xanoscriptParser(`run.job "Average of values" {
      pre = {name: "avg_value", input: {left: 1, right: 2}}
    }`);
    expect(parser.errors).to.not.be.empty;

    parser = xanoscriptParser(`run.job "Average of values" {}`);
    expect(parser.errors).to.not.be.empty;
  });

  it("should accept env variable", () => {
    const parser = xanoscriptParser(`run.job "Gemini -> Image Understanding" {
      main = {
        name : "Gemini -> Image Understanding"
        input: {
          model : "gemini-1.5-flash"
          prompt: "Describe what is happening in this image."
          image : "(attach image file)"
        }
      }
    
      env = ["gemini_api_key"]
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("should parse a basic run.service", () => {
    const parser = xanoscriptParser(`run.service "email proxy" {
      pre = {name: "email_proxy_fn", input: {}}
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("run.service has a minimal form", () => {
    const parser = xanoscriptParser(`run.service "email proxy"`);
    expect(parser.errors).to.be.empty;
  });

  it("environment variables can only be an array of strings", () => {
    let parser = xanoscriptParser(`run.service "email proxy" {
      env = ["email_proxy_api_key", 123, true]
    }`);
    expect(parser.errors).to.not.be.empty;

    parser = xanoscriptParser(`run.job "Average of values" {
      main = {name: "avg_value", input: {}}
      env = ["email_proxy_api_key", 123, true]
    }`);
    expect(parser.errors).to.not.be.empty;

    parser = xanoscriptParser(`run.service "email proxy" {
      env = []
    }`);
    expect(parser.errors).to.be.empty;

    parser = xanoscriptParser(`run.service "email proxy" {
      env = ["a_value", "another value"]
    }`);
    expect(parser.errors).to.be.empty;
  });

  it("run.service does not require a pre", () => {
    const parser = xanoscriptParser(`run.service "email proxy"`);
    expect(parser.errors).to.be.empty;
  });

  it("run.service does not accept a main", () => {
    const parser = xanoscriptParser(`run.service "email proxy" {
      main = { name : "some_fn", input: {} }
    }`);
    expect(parser.errors).to.not.be.empty;
  });

  it("run.service accepts env variables", () => {
    const parser = xanoscriptParser(`run.service "email proxy" {
      pre = {name: "email_proxy_init", input: {}}
      env = ["email_proxy_api_key"]
    }`);
    expect(parser.errors).to.be.empty;
  });
});
