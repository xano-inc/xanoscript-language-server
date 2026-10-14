import { expect } from "chai";
import { describe, it } from "mocha";
import { lexDocument } from "../../../lexer/lexer.js";
import { parser } from "../../test_parser.js";

function parse(inputText) {
  parser.reset();
  const lexResult = lexDocument(inputText);
  parser.input = lexResult.tokens;
  parser.functionRunFn();
  return parser;
}

describe("functionRunFn", () => {
  it("functionRunFn accepts data field", () => {
    const parser = parse(`function.run add {
      input = {a: $input.a, b: $b}
    } as $func1`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn accepts an empty payload", () => {
    const parser = parse(`function.run add {
      input = {}
    } as $func1`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn accepts complex expression as input", () => {
    const parser = parse(`function.run "my_complex_function" {
      input = {
        Snumber     : (($SomeVar.0.var_rel/55) > 0 ? ($SomeVar.0.var_rel1/61) : 6)+(($My_Var_S2.0.elo/ 60) > 7 ? ($My_Var_S2.0.elo/62) : 9)+(($Optional_var2.0.det/63) > 4 ? ($Optional_var2.0.det /64) : 2)+(($PtSgeS_sge.0.elo/65) > 1 ? ($PtSgeS_sge.0.elo/66) : 3)
        NumberObject: []
      }
    } as $Var_Round`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn accepts a string for function name", () => {
    const parser = parse(`function.run "my/function" {
      input = {a: $input.a, b: $b}
    } as $func1`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn can be disabled", () => {
    const parser = parse(`function.run add {
      input = {a: $input.a, b: $b}
      disabled = true
    } as $new_user`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn can call a function in a folder", () => {
    const parser = parse(`function.run "math/add" {
      input = {a: $input.a, b: $b}
    } as $new_user`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn can call requires quote when calling a function in a folder", () => {
    const parser = parse(`function.run math/add {
      input = {a: $input.a, b: $b}
    } as $new_user`);
    expect(parser.errors).to.not.be.empty;
  });

  it("functionRunFn rejects input that is not an object", () => {
    const parser = parse(`function.run math/add {
      input = $input
    } as $new_user`);
    expect(parser.errors).to.not.be.empty;
  });

  it("functionRunFn accepts a description", () => {
    const parser = parse(`function.run add {
      description = "run a function"
      input = {a: $input.a, b: $b}
    } as $new_user`);
    expect(parser.errors).to.be.empty;
  });

  it("functionRunFn can be empty", () => {
    const parser = parse(`function.run add as $user`);
    expect(parser.errors).to.be.empty;
  });
});
