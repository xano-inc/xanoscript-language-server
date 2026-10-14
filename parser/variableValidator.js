import { scanVariableUsages } from "./variableScanner.js";

/**
 * Validate variable declarations vs usages.
 * Returns undefined-variable warnings and unused-variable hints.
 * @param {Object} symbolTable - The parser's __symbolTable
 * @param {import('chevrotain').IToken[]} tokens - The token stream from parser.input
 * @returns {{ warnings: Array<{message: string, startOffset: number, endOffset: number}>, hints: Array<{message: string, startOffset: number, endOffset: number}> }}
 */
export function validateVariables(symbolTable, tokens) {
  const warnings = [];
  const hints = [];

  const declarations = symbolTable.varDeclarations || [];
  const declaredNames = new Set(declarations.map((d) => d.name));

  const usages = scanVariableUsages(tokens, declarations);
  const usedNames = new Set(usages.map((u) => u.name));

  // Undefined: used but not declared
  for (const usage of usages) {
    if (!declaredNames.has(usage.name)) {
      warnings.push({
        message: `Unknown variable '${usage.name}'`,
        startOffset: usage.startOffset,
        endOffset: usage.endOffset,
      });
    }
  }

  // Unused: declared but never used
  for (const decl of declarations) {
    if (decl.startOffset == null) continue;
    if (!usedNames.has(decl.name)) {
      hints.push({
        message: `Variable '${decl.name}' is declared but never used`,
        startOffset: decl.startOffset,
        endOffset: decl.endOffset,
      });
    }
  }

  return { warnings, hints };
}
