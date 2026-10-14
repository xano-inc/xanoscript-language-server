import { lexDocument } from "../lexer/lexer.js";
import { LongFormVariable, ShortFormVariable } from "../lexer/variables.js";
import { getVarName } from "../parser/generic/utils.js";
import { xanoscriptParser } from "../parser/parser.js";

// Token names that precede a table name reference
const DB_OPERATION_TOKENS = new Set([
  "get",
  "add",
  "edit",
  "delete",
  "query",
  "patch",
  "increment",
  "has",
  "truncate",
  "add_or_edit",
  "schema",
]);

const SHORT_FORM = ShortFormVariable.name;
const LONG_FORM = LongFormVariable.name;

/**
 * Find the definition location for the symbol at the given offset.
 * @param {string} text - Document text
 * @param {number} offset - Cursor offset in document
 * @param {import('../workspace/workspaceIndex.js').WorkspaceIndex} index
 * @param {Object} [symbolTable] - Parsed symbol table (optional, for variable lookups)
 * @returns {{ uri: string, offset?: number } | null}
 */
export function findDefinition(text, offset, index, symbolTable) {
  const lexResult = lexDocument(text);
  const tokens = lexResult.tokens;

  // Find the token at the cursor position
  let tokenIndex = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startOffset <= offset && offset <= tokens[i].endOffset) {
      tokenIndex = i;
      break;
    }
  }

  if (tokenIndex < 0) return null;

  const token = tokens[tokenIndex];
  const typeName = token.tokenType.name;

  // Variable go-to-definition
  if (typeName === SHORT_FORM || typeName === LONG_FORM) {
    // Parse if no symbol table provided
    const st =
      symbolTable ||
      xanoscriptParser(text, undefined, lexResult).__symbolTable;
    return findVariableDefinition(tokens, tokenIndex, st);
  }

  // For LongFormVariable ($var), check if cursor is on the identifier after $var.
  // e.g., "$var.foo" — cursor on "foo" (an Identifier token after DotToken after LongFormVariable)
  if (
    tokenIndex >= 2 &&
    tokens[tokenIndex - 1].image === "." &&
    tokens[tokenIndex - 2].tokenType.name === LONG_FORM
  ) {
    const st =
      symbolTable ||
      xanoscriptParser(text, undefined, lexResult).__symbolTable;
    return findVariableDefinition(tokens, tokenIndex, st);
  }

  const name = getVarName(token);

  // Look backwards to determine context (cross-file references)
  for (let i = tokenIndex - 1; i >= 0 && i >= tokenIndex - 3; i--) {
    const prevImage = tokens[i].image.toLowerCase();

    if (prevImage === "run" || prevImage === "call") {
      // Check what's before: function. or task. or api.
      if (i >= 2 && tokens[i - 1].image === ".") {
        const prefix = tokens[i - 2].image.toLowerCase();
        if (prefix === "function") {
          const entry = index.get("function", name);
          return entry ? { uri: entry.uri } : null;
        }
        if (prefix === "task") {
          const entry = index.get("task", name);
          return entry ? { uri: entry.uri } : null;
        }
        if (prefix === "api") {
          const entry = index.get("query", name);
          return entry ? { uri: entry.uri } : null;
        }
      }
    }

    if (DB_OPERATION_TOKENS.has(prevImage)) {
      const entry = index.get("table", name);
      return entry ? { uri: entry.uri } : null;
    }
  }

  return null;
}

/**
 * Find the declaration offset for a variable token.
 * @param {import('chevrotain').IToken[]} tokens
 * @param {number} tokenIndex - Index of the token the cursor is on
 * @param {Object} symbolTable
 * @returns {{ offset: number } | null}
 */
function findVariableDefinition(tokens, tokenIndex, symbolTable) {
  const declarations = symbolTable?.varDeclarations;
  if (!declarations || declarations.length === 0) return null;

  const token = tokens[tokenIndex];
  const typeName = token.tokenType.name;

  let varName;
  if (typeName === SHORT_FORM) {
    varName = token.image; // "$foo"
  } else if (typeName === LONG_FORM) {
    // $var.foo → resolve to $foo
    if (tokenIndex + 2 < tokens.length) {
      varName = `$${tokens[tokenIndex + 2].image}`;
    } else {
      return null;
    }
  } else {
    // Cursor is on the identifier after "$var." (e.g., "foo" in "$var.foo")
    varName = `$${token.image}`;
  }

  // Find the first declaration for this variable
  const decl = declarations.find((d) => d.name === varName);
  if (!decl || decl.startOffset == null) return null;

  // Don't navigate if cursor is already on the declaration
  if (token.startOffset === decl.startOffset) return null;
  // For LongFormVariable, also check if the identifier token matches
  if (
    typeName === LONG_FORM &&
    tokenIndex + 2 < tokens.length &&
    tokens[tokenIndex + 2].startOffset === decl.startOffset
  ) {
    return null;
  }

  return { offset: decl.startOffset };
}
