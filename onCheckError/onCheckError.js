import { xanoscriptParser } from "../parser/parser";
import { getSchemeFromContent } from "../utils";

export const SEVERITY = {
  ERROR: 1,
  WARNING: 2,
};

function toDiagnostic(text, item, severity) {
  const startOffset = item.token?.startOffset ?? 0;
  const endOffset = item.token?.endOffset ?? (startOffset + 5);
  const lines = text.substring(0, startOffset).split("\n");
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;

  const endLines = text.substring(0, endOffset + 1).split("\n");
  const endLine = endLines.length - 1;
  const endCharacter = endLines[endLines.length - 1].length;

  return {
    severity,
    range: {
      start: { line, character },
      end: { line: endLine, character: endCharacter },
    },
    message: item.message,
    source: item.name || "XanoScript Parser",
  };
}

export function onCheckError(text, objectType) {
  const scheme = getSchemeFromContent(objectType ?? text);

  try {
    const parser = xanoscriptParser(text, scheme);

    const diagnostics = [];

    for (const error of parser.errors) {
      diagnostics.push(toDiagnostic(text, error, SEVERITY.ERROR));
    }
    for (const warning of parser.warnings ?? []) {
      diagnostics.push(toDiagnostic(text, warning, SEVERITY.WARNING));
    }

    return diagnostics;
  } catch (error) {
    console.error("Error checking for XanoScript errors:", error);
  }
}
