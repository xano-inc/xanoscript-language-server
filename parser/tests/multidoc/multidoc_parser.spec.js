import { expect } from "chai";
import { readdirSync, readFileSync } from "fs";
import { truncate } from "lodash-es";
import { describe, it } from "mocha";
import { dirname, join } from "path";
import { multidocParser } from "../../multidoc.js";

describe("Xanoscript MultiDoc Parser", () => {
  it("parses all the valid sources", () => {
    const errors = [];
    const files = readdirSync(
      join(dirname("./"), "parser/tests/multidoc/valid_sources"),
    );

    files.forEach((file) => {
      const source = readFileSync(
        join(dirname("./"), "parser/tests/multidoc/valid_sources", file),
        "utf8",
      );
      const parser = multidocParser(source);

      if (parser.errors.length > 0) {
        parser.errors.forEach((error) => {
          errors.push({
            previous: error.previousToken
              ? `${error.previousToken.tokenTypeName} (${truncate(
                  error.previousToken.image,
                  {
                    length: 20,
                  },
                )})`
              : "N/A",
            file: error.token
              ? `parser/tests/multidoc/valid_sources/${file}:${error.token.startLine}:${error.token.startColumn}`
              : `parser/tests/multidoc/valid_sources/${file}`,
            stack: parser.sectionStack
              ? parser.sectionStack[parser.sectionStack.length - 1]
              : "N/A",
            message: truncate(error.message, { length: 50 }),
            token: error.token
              ? `${error.token.tokenTypeName} (${truncate(error.token.image, {
                  length: 20,
                })})`
              : "N/A",
          });
        });
      }
    });

    if (errors.length > 0) {
      console.table(errors);
    }

    expect(errors).to.be.empty;
  });
});
