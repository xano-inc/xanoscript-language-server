import { CommentToken } from "../lexer/comment.js";
import { EqualToken, LCurly, LSquare, Minus, RCurly } from "../lexer/control.js";
import {
  FloatLiteral,
  IntegerLiteral,
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../lexer/literal.js";
import { PolicyToken } from "../lexer/policy.js";
import { DotToken, Identifier, NewlineToken } from "../lexer/tokens.js";
import { getPolicyCatalogue } from "./policy/catalogue.js";
import { policyStringValue, readPolicyLiteral } from "./policy/policyLiteral.js";
import { didYouMean, validatePolicyRule } from "./policy/validatePolicyRule.js";

// Grammar for a `policy <key> { ... }` document.
//
// The language server knows the block SHAPE, as it knows every other object type's:
//
//   policy <key> {
//     <field> = <literal>          # one per line
//     rule { <field> = <literal> } # repeating; `check` names a catalogue item, `params` its params
//   }
//
// with the comment, named-rule and literal-value rules the platform enforces. It knows no
// field: which fields a policy and a rule may set, their types, value sets and defaults, the retired
// fields and reserved blocks, the key pattern and when a rule is required all come from the
// catalogue's `document`, and every check from its `items`. With no
// catalogue loaded, only the shape is checked. See parser/policy/catalogue.js.

/** The platform's refusal of a named rule, after its `rule[<i>]: ` prefix. */
const RULE_NAMED =
  'A rule cannot be named. Write "rule {" — rules are identified by position (KEY.R1, KEY.R2…).';

/** The platform's refusal of a comment inside a policy block, naming the comment's line. */
const COMMENT_REFUSED = (kind, line) =>
  `line ${line}: policy files cannot contain "${kind}" comments. Put the explanation in the policy's statement, rationale or narrative.`;

/** `sprintf` for the platform's `%s` / `%d` sentences; the value is inserted as it is. */
const fill = (message, value) => String(message).replace(/%[sd]/, () => String(value));

/**
 * `<key>` after `policy`: a quoted string, or letters, digits, ".", "_" and "-" written together,
 * which the lexer splits into several tokens (`AUTH-001` is `AUTH`, `-`, `001`).
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function policyKeyFn($) {
  return (tokens) => {
    const add = (token) => $.ACTION(() => tokens.push(token));
    $.OR([
      { ALT: () => add($.CONSUME(StringLiteral)) },
      { ALT: () => add($.CONSUME(SingleQuotedStringLiteral)) },
      {
        ALT: () => {
          $.AT_LEAST_ONE(() => {
            add(
              $.OR1([
                { ALT: () => $.CONSUME(Identifier) },
                { ALT: () => $.CONSUME(IntegerLiteral) },
                { ALT: () => $.CONSUME(FloatLiteral) },
                { ALT: () => $.CONSUME(Minus) },
                { ALT: () => $.CONSUME(DotToken) },
              ])
            );
          });
        },
      },
    ]);
  };
}

/**
 * `name = value`, in a policy or a rule. Any value expression parses here; what the field may hold
 * (a literal of its declared type) is checked once the block is read.
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function policyFieldFn($) {
  return (fields) => {
    const keyToken = $.CONSUME(Identifier);
    $.CONSUME(EqualToken); // "="
    const first = $.ACTION(() => $.LA(1));
    $.SUBRULE($.schemaFn, { ARGS: [keyToken, "[expression]"] });
    $.ACTION(() => {
      fields.push({ name: keyToken.image, keyToken, first, last: $.LA(0) });
      const next = $.LA(1);
      if (next.tokenType !== NewlineToken && next.image !== "}" && next.startLine === $.LA(0).endLine) {
        $.addInvalidValueError(next, "Policy fields must be separated by a newline.");
      }
    });
  };
}

/**
 * `{ ... }` of a rule (or of a block that is not one, read the same way so the rest parses): fields
 * only, one per line.
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function policyBlockBodyFn($) {
  return (block) => {
    $.CONSUME(LCurly); // "{"
    // Native blocks also allow compact, same-line fields.
    $.MANY(() => {
      $.OR([
        { ALT: () => $.CONSUME(NewlineToken) },
        {
          ALT: () => {
            const comment = $.CONSUME(CommentToken);
            $.ACTION(() => block.comments.push(comment));
          },
        },
        { ALT: () => $.SUBRULE($.policyFieldFn, { ARGS: [block?.fields] }) },
      ]);
    });
    $.CONSUME(RCurly); // "}"
  };
}

/**
 * `rule { ... }`, and anything else written as `<word> [name] { ... }` inside a policy (`guard`,
 * `test`, a misplaced `remediation { }`): read alike, told apart when the policy is checked. A name
 * is read the way a key is (a quoted string, or a bare run such as `1`, `a.b` or `x-2`), since the
 * platform refuses each of them as a name.
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function policyBlockFn($) {
  return (blocks) => {
    const block = { token: null, nameToken: null, fields: [], comments: [] };
    const nameTokens = [];
    block.token = $.CONSUME(Identifier); // "rule"
    $.OPTION(() => $.SUBRULE($.policyKeyFn, { ARGS: [nameTokens] }));
    $.ACTION(() => {
      block.nameToken = nameTokens[0] ?? null;
    });
    $.SUBRULE($.policyBlockBodyFn, { ARGS: [block] });
    $.ACTION(() => blocks.push(block));
  };
}

/**
 * @param {import('./base_parser.js').XanoBaseParser} $
 */
export function policyDeclaration($) {
  return () => {
    const fields = [];
    const blocks = [];
    const comments = [];

    $.sectionStack.push("policyDeclaration");
    // Comments before the block are formatting; inside it they are refused.
    $.MANY(() => $.OR([
      { ALT: () => $.CONSUME(NewlineToken) },
      { ALT: () => $.CONSUME(CommentToken) },
    ]));
    const policyToken = $.CONSUME(PolicyToken); // "policy"
    const keyTokens = [];
    $.SUBRULE($.policyKeyFn, { ARGS: [keyTokens] });
    $.CONSUME(LCurly); // "{"
    $.MANY1(() => {
      $.OR1([
        { ALT: () => $.CONSUME1(NewlineToken) },
        {
          ALT: () => {
            const comment = $.CONSUME1(CommentToken);
            $.ACTION(() => comments.push(comment));
          },
        },
        { ALT: () => $.SUBRULE($.policyFieldFn, { ARGS: [fields] }) },
        { ALT: () => $.SUBRULE($.policyBlockFn, { ARGS: [blocks] }) },
      ]);
    });
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.OR2([
      { ALT: () => $.CONSUME2(NewlineToken) },
      { ALT: () => $.CONSUME2(CommentToken) },
    ]));

    $.ACTION(() =>
      checkPolicy($, { policyToken, keyTokens, fields, blocks, comments })
    );
    $.sectionStack.pop();
  };
}

/**
 * The comment starting at `tokens[i]`: an own-line `//` (a comment token), or a `//` or `/*` the lexer
 * read as divisions because something precedes it on the line. With `slashOnly`, only the latter.
 */
function commentAt(tokens, i, slashOnly = false) {
  const token = tokens[i];
  if (!token) return null;
  if (token.tokenType === CommentToken) return slashOnly ? null : { token, kind: "//" };
  const next = tokens[i + 1];
  if (token.image === "/" && next && token.endOffset + 1 === next.startOffset && (next.image === "/" || next.image === "*")) {
    return { token, kind: next.image === "/" ? "//" : "/* */" };
  }
  return null;
}

/**
 * A comment the grammar cannot place (inside `params` or a list, after a value on the same line, or
 * `/* *\/`) stops the parse; say what the platform says about it, at the comment, instead of
 * "Expecting }".
 * @param {import('./base_parser.js').XanoBaseParser} parser after `policyDeclaration()`
 */
export function explainPolicySyntaxErrors(parser) {
  const tokens = parser.input;
  for (const error of parser.errors) {
    let at = tokens.indexOf(error.token);
    if (at < 0) continue;
    // A `{` or `[` the parse could not read past: a comment may be the first thing inside it.
    if (tokens[at].tokenType === LCurly || tokens[at].tokenType === LSquare) {
      let next = at + 1;
      while (tokens[next]?.tokenType === NewlineToken) next++;
      if (commentAt(tokens, next)) at = next;
    }
    // The parse stops at the comment, or at its second character after reading a `/` as a division.
    const comment = commentAt(tokens, at) ?? commentAt(tokens, at - 1, true);
    if (comment) {
      error.token = comment.token;
      error.message = COMMENT_REFUSED(comment.kind, comment.token.startLine);
    }
  }
}

/**
 * Report through the parser. What the block's shape decides is an error. What the catalogue decides
 * is an error against the instance's own (live) catalogue, and a dated warning against the snapshot
 * shipped with the language server, which may be older than the instance; a finding that mirrors
 * platform logic beyond the published schema (`advisory`) is a warning either way.
 */
function reporter($, catalogue) {
  const error = (token, message) => $.addInvalidValueError(token, message);
  const warning = (token, message) => $.addWarning(message, token);
  const dated = catalogue.generatedAt ? ` of ${catalogue.generatedAt}` : "";
  return {
    error,
    catalogue: (token, message, advisory = false) => {
      if (catalogue.source === "live" && !advisory) {
        error(token, message);
      } else if (catalogue.source === "snapshot") {
        warning(token, `${message} (checked against the language server's check catalogue${dated}; your instance decides on save)`);
      } else {
        warning(token, message);
      }
    },
  };
}

/** A field's value as literals with their tokens, or null when it has none. */
function valueOf(input, field) {
  if (!field?.first || !field?.last) return null;
  return readPolicyLiteral(input, input.indexOf(field.first), input.indexOf(field.last));
}

/**
 * Whether a field's literal value has the type the document declares (`string`, `string[]`,
 * `bool`, `object`) and one of its `values`; the sentence when not.
 */
function fieldProblem(name, node, spec) {
  const type = spec?.type ?? "string";
  if (type === "string[]") {
    if (node.kind !== "array" || node.items.some((item) => item?.kind !== "string")) {
      return { token: node.token, message: `${name} must be a list of strings.` };
    }
    const max = spec.max_length;
    const long = max ? node.items.findIndex((item) => [...item.value.trim()].length > max) : -1;
    if (long >= 0) {
      return { token: node.items[long].token, message: `${name}[${long}] must be ${max} characters or fewer.` };
    }
    return null;
  }
  if (type === "bool") {
    return node.kind === "boolean" ? null : { token: node.token, message: `${name} must be true or false.` };
  }
  if (type === "object") {
    return node.kind === "object" ? null : { token: node.token, message: `${name} must be an object.` };
  }
  if (node.kind !== "string") {
    return { token: node.token, message: `${name} must be a string.` };
  }
  if (spec?.values?.length && !spec.values.includes(node.value.trim())) {
    return {
      token: node.token,
      message: `${name} must be one of: ${spec.values.join(", ")} (got "${node.value.trim()}").`,
    };
  }
  return null;
}

/**
 * A rule's params: an object of literal values (Script::literal; a name written twice is already
 * reported by the object grammar). The catalogue then says what the object may hold.
 */
function checkParamsShape(node, report) {
  if (!node) return;
  // The native transform normalizes null and an empty list to empty params.
  if (node.kind === "null" || (node.kind === "array" && node.items.length === 0)) return;
  if (node.kind !== "object") {
    report.error(
      node.token,
      node.kind === "expression"
        ? "Policy parameters must be literal values."
        : 'params must be an object, e.g. params = { tags: ["pci"] }.'
    );
    return;
  }
  const visit = (value) => {
    if (!value) return;
    if (value.kind === "expression") {
      report.error(value.token, "Policy parameters must be literal values.");
    } else if (value.kind === "object") {
      value.entries.forEach((entry) => visit(entry.value));
    } else if (value.kind === "array") {
      value.items.forEach(visit);
    }
  };
  visit(node);
}

/**
 * One block's fields (a policy's or a rule's): each once, a literal, and, when the catalogue
 * describes the document, one it declares, of its type. `retired` and `where` shape the sentences.
 * @returns {Object<string, {field: Object, node: Object|null}>} the fields by name
 */
function checkFields(fields, { input, report, specs, retired, where, extra = [], index }) {
  const out = Object.create(null);
  const names = specs ? [...Object.keys(specs), ...extra] : [];
  for (const field of fields) {
    const { name, keyToken } = field;
    if (retired && Object.hasOwn(retired, name)) {
      report.catalogue(keyToken, fill(retired[name], index));
      continue;
    }
    if (specs && !Object.hasOwn(specs, name)) {
      report.catalogue(
        keyToken,
        `${where}: unknown field "${name}". ${didYouMean(name, names)}${where === "policy" ? "Policy" : "Rule"} fields: ${names.join(", ")}.`
      );
      continue;
    }
    if (name in out) {
      report.error(keyToken, `${where}: "${name}" is set more than once.`);
      continue;
    }
    const node = valueOf(input, field);
    out[name] = { field, node };
    // `params` is the check's own object; checkParamsShape and the catalogue read it.
    if (!node || name === "params") continue;
    if (node.kind === "expression") {
      report.error(node.token, `${name} must be a literal value.`);
      continue;
    }
    const problem = specs ? fieldProblem(name, node, specs[name]) : null;
    if (problem) report.catalogue(problem.token, problem.message);
  }
  return out;
}

/**
 * Everything the platform refuses that the block decides, then each rule against the catalogue.
 */
function checkPolicy($, { policyToken, keyTokens, fields, blocks, comments }) {
  const catalogue = getPolicyCatalogue();
  const document = catalogue.document;
  const report = reporter($, catalogue);
  const input = $.input;

  for (const comment of comments) report.error(comment, COMMENT_REFUSED("//", comment.startLine));

  // The key, as the platform reads it: the text from its first token to its last.
  const keyToken = keyTokens[0] ?? policyToken;
  const contiguous = keyTokens.every(
    (token, i) => i === 0 || keyTokens[i - 1].endOffset + 1 === token.startOffset
  );
  const key =
    keyTokens.length === 1 && /^["']/.test(keyTokens[0].image)
      ? policyStringValue(keyTokens[0].image).trim()
      : contiguous
        ? keyTokens.map((token) => token.image).join("")
        : `${keyTokens[0].image}…${keyTokens[keyTokens.length - 1].image}`;
  if (document?.key?.pattern) {
    let pattern = null;
    try {
      pattern = new RegExp(document.key.pattern);
    } catch {
      pattern = null;
    }
    if (pattern && !pattern.test(key)) report.catalogue(keyToken, fill(document.key.message, key));
  } else if (!contiguous) {
    report.error(keyToken, `Policy key "${key}" must be written without spaces.`);
  }

  const values = checkFields(fields, {
    input,
    report,
    specs: document?.fields,
    retired: document?.retired?.policy,
    where: "policy",
    extra: ["rule"],
  });

  // Blocks: rules, and blocks a policy does not have.
  const reserved = document?.reserved_blocks;
  let ruleIndex = 0;
  for (const block of blocks) {
    const word = block.token.image;
    for (const comment of block.comments) report.error(comment, COMMENT_REFUSED("//", comment.startLine));

    if (word !== "rule") {
      if (reserved?.names?.includes(word)) {
        report.catalogue(block.token, fill(reserved.message, word));
      } else if (document?.retired?.policy && Object.hasOwn(document.retired.policy, word)) {
        report.catalogue(block.token, document.retired.policy[word]);
      } else {
        report.error(block.token, `policy: unknown block "${word}". ${didYouMean(word, ["rule"])}Policies support rule blocks only.`);
      }
      continue;
    }

    const index = ruleIndex++;
    if (block.nameToken) report.error(block.nameToken, `rule[${index}]: ${RULE_NAMED}`);

    const rule = checkFields(block.fields, {
      input,
      report,
      specs: document?.rule,
      retired: document?.retired?.rule,
      where: `rule[${index}]`,
      index,
    });

    checkParamsShape(rule.params?.node, report);
    if (!rule.check) {
      if (document?.rule?.check?.required) {
        report.catalogue(block.token, `rule[${index}]: "check" is required. Name a check from the catalogue: check = "<check id>".`);
      }
      continue;
    }

    const checkNode = rule.check.node;
    const problems = validatePolicyRule(
      {
        checkId: checkNode?.kind === "string" ? checkNode.value.trim() : null,
        checkToken: checkNode?.token ?? null,
        paramsToken: rule.params?.field.keyToken ?? null,
        params: rule.params?.node ?? null,
        ruleToken: block.token,
      },
      catalogue
    );
    for (const problem of problems) report.catalogue(problem.token, problem.message, problem.advisory);
  }

  // A policy with no rule: allowed only for the field values the document names.
  const required = document?.rules_required;
  if (required && ruleIndex === 0) {
    const allowed = Object.entries(required.unless ?? {}).some(([name, value]) => {
      const node = values[name]?.node;
      const inForce = node && node.kind !== "expression" ? node.value : document.fields?.[name]?.default;
      return inForce === value;
    });
    if (!allowed) report.catalogue(keyToken, required.message);
  }
}
