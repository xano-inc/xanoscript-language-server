import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { WhereToken } from "../lexer/db.js";
import { StringLiteral } from "../lexer/literal.js";
import {
  ActionsToken,
  ActiveToken,
  DatasourcesToken,
  TableTriggerToken,
} from "../lexer/table_trigger.js";
import { Identifier, NewlineToken } from "../lexer/tokens.js";

export function tableTriggerDeclaration($) {
  return () => {
    let hasActions = false;
    let hasActive = false;
    let hasDatasources = false;
    let hasDbTable = false;
    let hasDescription = false;
    let hasGuid = false;
    let hasHistory = false;
    let hasInput = false;
    let hasStack = false;
    let hasTags = false;
    let hasWhere = false;

    // @TODO: search

    $.sectionStack.push("tableTriggerDeclaration");
    // Allow leading comments and newlines before the table_trigger declaration
    $.SUBRULE($.optionalCommentBlockFn);

    const parent = $.CONSUME(TableTriggerToken); // table_trigger
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "table_trigger");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        { ALT: () => $.SUBRULE($.commentBlockFn) },
        {
          GATE: () => !hasActions,
          ALT: () => {
            hasActions = true;

            const subParent = $.CONSUME(ActionsToken); // "actions"
            $.CONSUME(EqualToken); // "="

            $.SUBRULE($.schemaParseObjectFn, {
              ARGS: [
                subParent,
                {
                  "delete?": "[boolean]",
                  "insert?": "[boolean]",
                  "truncate?": "[boolean]",
                  "update?": "[boolean]",
                },
              ],
            });
          },
        },
        {
          GATE: () => !hasActive,
          ALT: () => {
            hasActive = true;
            $.CONSUME(ActiveToken);
            $.CONSUME2(EqualToken);
            $.SUBRULE($.booleanValue);
          },
        },
        {
          GATE: () => !hasDatasources,
          ALT: () => {
            hasDatasources = true;
            const parent = $.CONSUME(DatasourcesToken);
            $.CONSUME3(EqualToken);
            $.SUBRULE($.schemaFn, {
              ARGS: [parent, ["[string]"]],
            });
          },
        },
        {
          GATE: () => !hasDbTable,
          ALT: () => {
            hasDbTable = true;
            $.SUBRULE($.dbTableClause);
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
          GATE: () => !hasWhere,
          ALT: () => {
            hasWhere = true;
            const token = $.CONSUME(WhereToken, { LABEL: "where" });
            $.CONSUME1(EqualToken);
            $.SUBRULE($.expressionFn, {
              ARGS: [
                token,
                {
                  allowQueryExpression: true,
                  allowVariable: true,
                  allowExpression: false,
                  allowComparison: true,
                },
              ],
            });
          },
        },
      ]);
    });

    if (!hasDbTable) {
      $.addMissingError(parent, "{} is missing table clause");
    }

    if (!hasInput) {
      $.addMissingError(parent, "{} is missing an input clause");
    }

    if (!hasStack) {
      $.addMissingError(parent, "{} is missing a stack clause");
    }

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}
