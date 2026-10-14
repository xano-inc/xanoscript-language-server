import { ApiGroupToken } from "../lexer/api_group.js";
import { CommentToken } from "../lexer/comment.js";
import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import {
  DELETEToken,
  ExternalAccessToken,
  GETToken,
  PATCHToken,
  POSTToken,
  PUTToken,
  QueryToken,
  ResponseTypeToken,
  VerbToken,
} from "../lexer/query.js";
import {
  AuthToken,
  FalseToken,
  Identifier,
  NewlineToken,
  TrueToken,
} from "../lexer/tokens.js";
import { getVarName } from "./generic/utils.js";

export function queryDeclaration($) {
  return () => {
    let hasAuth = false;
    let hasCache = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasDocs = false;
    let hasHistory = false;
    let hasInput = false;
    let hasMiddleware = false;
    let hasResponse = false;
    let hasStack = false;
    let hasTags = false;
    let hasApiGroup = false;
    let hasResponseType = false;
    let hasExternalAccess = false;
    let responseType = "standard";

    const testNames = [];

    $.sectionStack.push("queryDeclaration");
    // Allow leading comments and newlines before the query declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(QueryToken);
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) }, // "foo/bar"
      { ALT: () => $.CONSUME(Identifier) }, // foo
    ]);

    $.validateDeclarationName(nameToken, "query");
    if (nameToken?.image && getVarName(nameToken).startsWith("/")) {
      $.addInvalidValueError(nameToken, "query name must not start with '/'");
    }

    $.CONSUME(VerbToken);
    $.CONSUME(EqualToken);
    $.OR1([
      { ALT: () => $.CONSUME(DELETEToken) },
      { ALT: () => $.CONSUME(GETToken) },
      { ALT: () => $.CONSUME(PATCHToken) },
      { ALT: () => $.CONSUME(POSTToken) },
      { ALT: () => $.CONSUME(PUTToken) },
    ]);
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.CONSUME(CommentToken),
        },
        {
          GATE: () => !hasAuth,
          ALT: () => {
            hasAuth = true;
            $.CONSUME(AuthToken); // "auth"
            $.CONSUME1(EqualToken); // "="
            $.CONSUME1(StringLiteral); // "user"
          },
        },
        {
          GATE: () => !hasResponseType,
          ALT: () => {
            hasResponseType = true;
            $.CONSUME(ResponseTypeToken);
            $.CONSUME8(EqualToken);
            const valueToken = $.CONSUME2(StringLiteral);
            responseType = getVarName(valueToken);
            if (!["stream", "standard"].includes(responseType)) {
              $.addInvalidValueError(
                valueToken,
                "response_type must be either 'stream' or 'standard'",
              );
            }
          },
        },
        {
          GATE: () => !hasCache,
          ALT: () => {
            hasCache = true;
            $.SUBRULE($.cacheClause);
          },
        },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasGuid,
          ALT: () => {
            hasGuid = true;
            $.SUBRULE($.guidFieldAttribute);
          },
        },
        {
          GATE: () => !hasApiGroup,
          ALT: () => {
            hasApiGroup = true;
            $.CONSUME(ApiGroupToken);
            $.CONSUME2(EqualToken);
            $.CONSUME3(StringLiteral);
          },
        },
        {
          GATE: () => !hasExternalAccess,
          ALT: () => {
            hasExternalAccess = true;
            $.CONSUME(ExternalAccessToken); // "external_access"
            $.CONSUME3(EqualToken); // "="
            $.OR3([
              { ALT: () => $.CONSUME(TrueToken) }, // true
              { ALT: () => $.CONSUME(FalseToken) }, // false
            ]);
          },
        },
        {
          GATE: () => !hasDocs,
          ALT: () => {
            hasDocs = true;
            $.SUBRULE($.docsFieldAttribute);
          },
        },
        {
          GATE: () => !hasHistory,
          ALT: () => {
            hasHistory = true;
            $.SUBRULE($.historyClause);
          },
        },
        {
          GATE: () => !hasInput,
          ALT: () => {
            hasInput = true;
            $.SUBRULE($.inputClause);
          },
        },
        {
          GATE: () => !hasMiddleware,
          ALT: () => {
            hasMiddleware = true;
            $.SUBRULE($.middlewareClause);
          },
        },
        {
          GATE: () => !hasResponse,
          ALT: () => {
            hasResponse = true;
            $.SUBRULE($.responseClause);
          },
        },
        {
          GATE: () => !hasStack,
          ALT: () => {
            hasStack = true;
            $.SUBRULE($.stackClause);
          },
        },
        {
          GATE: () => !hasTags,
          ALT: () => {
            hasTags = true;
            $.SUBRULE($.tagsAttribute);
          },
        },
        {
          // no GATE here, you can have multiple test clauses
          ALT: () => {
            $.SUBRULE($.testClause, { ARGS: [testNames] });
          },
        },
      ]);
    });

    // when not provided, the api_group will default to the api_group.xs file defined in the same folder
    if (!hasApiGroup) {
      $.addWarning(
        "api_group is not provided, defaulting to api_group.xs defined in the same folder",
        parent,
      );
    }

    if (!hasInput) {
      $.addMissingError(parent, "{} is missing an input clause");
    }

    if (!hasStack) {
      $.addMissingError(parent, "{} is missing a stack clause");
    }

    if (!hasResponse && responseType === "standard") {
      $.addMissingError(parent, "{} is missing a response clause");
    }

    if (hasResponse && responseType === "stream") {
      $.addInvalidValueError(
        parent,
        "response clause is not allowed when response_type is 'stream'",
      );
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
