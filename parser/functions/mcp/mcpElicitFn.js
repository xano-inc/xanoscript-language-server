import { EqualToken, LCurly, RCurly } from "../../../lexer/control.js";
import { ElicitToken } from "../../../lexer/mcp.js";
import { Identifier, NewlineToken } from "../../../lexer/tokens.js";
import { getVarName } from "../../generic/utils.js";
import { checkElicit } from "./elicitLint.js";

// mcp.elicit {
//   key = "confirm"                 // required: the answer's identity across retries
//   message = "Delete " ~ $input.name ~ "?"   // required
//   input {                         // optional: the form the client shows
//     bool proceed
//     text reason?
//   }
// } as $answer
//
// Asks the MCP client for input (the Xano backend mvp:mcp_elicit). Input is only
// collected from 2026-07-28 clients with form elicitation; every other client
// (and a non-MCP run) resolves to {action: "cancel"}. The `input` block is the
// same grammar as a tool's `input` block.

const REQUIRED = ["key", "message"];
const OPTIONAL = ["description", "disabled"];

/**
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export function mcpElicitFn($) {
  return () => {
    const defined = [];
    let hasInput = false;
    let hasMock = false;

    $.sectionStack.push("mcpElicitFn");
    const fnToken = $.CONSUME(ElicitToken); // "elicit"

    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // one attribute per line
      $.OR([
        { ALT: () => $.SUBRULE($.commentBlockFn) },
        {
          // input { ... } -- the elicitation form. Its fields describe the
          // ANSWER, not the object's own $input, so they must not register as
          // document inputs.
          GATE: () => !hasInput,
          ALT: () => {
            hasInput = true;
            let savedInputs;
            $.ACTION(() => {
              savedInputs = { ...$.__symbolTable.input };
            });
            $.SUBRULE($.inputClause);
            $.ACTION(() => {
              $.__symbolTable.input = savedInputs;
            });
          },
        },
        {
          GATE: () => !hasMock,
          ALT: () => {
            hasMock = true;
            $.SUBRULE($.mockAttribute);
          },
        },
        {
          // key = ..., message = ..., description = "...", disabled = true
          ALT: () => {
            const identifier = $.CONSUME(Identifier);
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.expressionFn, { ARGS: [identifier] });

            $.ACTION(() => {
              const name = getVarName(identifier);
              if (![...REQUIRED, ...OPTIONAL].includes(name)) {
                $.addIllegalAttributeError(
                  identifier,
                  `Attribute \`${name}\` is not allowed in mcp.elicit (expected ${[...REQUIRED, ...OPTIONAL, "input"].join(", ")})`,
                );
              } else if (defined.includes(name)) {
                $.addDuplicateAttributeError(identifier);
              }
              defined.push(name);
            });
          },
        },
      ]);
    });
    $.MANY1(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RCurly); // "}"

    $.ACTION(() => {
      const missing = REQUIRED.filter((name) => !defined.includes(name));
      if (missing.length) {
        $.addMissingAttributeError(fnToken, missing);
      }
      checkElicit($, fnToken);
    });

    // `as $answer` is optional: an elicit may be used only for its side effect.
    $.SUBRULE($.asVariable);
    $.sectionStack.pop();
  };
}
