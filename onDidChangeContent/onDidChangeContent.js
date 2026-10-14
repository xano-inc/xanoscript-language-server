import { documentCache } from "../cache/documentCache.js";
import { scanDbReferences } from "../parser/dbReferenceScanner.js";
import { validateVariables } from "../parser/variableValidator.js";
import { crossFileValidate } from "../workspace/crossFileValidator.js";
import { workspaceIndex } from "../workspace/workspaceIndex.js";

// Diagnostic severity constants
const SEVERITY = {
  ERROR: 1,
  WARNING: 2,
  INFORMATION: 3,
  HINT: 4,
};

/**
 * Creates diagnostics from parser results in a single pass.
 * @param {Object} parser - The parser with errors, warnings, informations, hints
 * @param {Object} document - The text document for position conversion
 * @returns {Array} Array of diagnostic objects
 */
function createDiagnostics(parser, document) {
  const diagnostics = [];
  const defaultRange = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 },
  };

  const addDiagnostic = (item, severity) => {
    diagnostics.push({
      severity,
      range: item.token
        ? {
            start: document.positionAt(item.token.startOffset),
            end: document.positionAt(item.token.endOffset + 1),
          }
        : defaultRange,
      message: item.message,
    });
  };

  for (const error of parser.errors) {
    addDiagnostic(error, SEVERITY.ERROR);
  }
  for (const warning of parser.warnings) {
    addDiagnostic(warning, SEVERITY.WARNING);
  }
  for (const info of parser.informations) {
    addDiagnostic(info, SEVERITY.INFORMATION);
  }
  for (const hint of parser.hints) {
    addDiagnostic(hint, SEVERITY.HINT);
  }

  return diagnostics;
}

/**
 *
 * @param {import('vscode-languageserver-protocol').TextDocumentChangeEvent} params
 * @param {import('vscode-languageserver').Connection} connection
 * @returns
 */
export function onDidChangeContent(params, connection, features = {}) {
  const document = params.document;

  if (!document) {
    console.error(
      "onDidChangeContent(): Document not found for URI:",
      params.textDocument.uri,
    );
    return null;
  }

  const text = document.getText();

  try {
    // Capture previous segment count before getOrParse overwrites the cache
    const prevCached = documentCache.cache.get(document.uri);
    const prevSegmentCount = prevCached?.parserState?.segmentCount ?? 0;

    // Parse the XanoScript file using cache
    const { lexResult, parser, scheme } = documentCache.getOrParse(
      document.uri,
      document.version,
      text,
    );

    // Update workspace index
    // Clean up old fragment URIs from previous parse
    for (let i = 0; i < prevSegmentCount; i++) {
      workspaceIndex.removeFile(`${document.uri}#${i}`);
    }
    if (parser.isMultidoc) {
      // Remove the base URI in case document switched from single to multidoc
      workspaceIndex.removeFile(document.uri);
      // Index each segment with fragment URIs
      if (parser.segments) {
        for (let i = 0; i < parser.segments.length; i++) {
          const seg = parser.segments[i];
          workspaceIndex.addParsed(
            `${document.uri}#${i}`,
            seg.text,
            seg.symbolTable,
          );
        }
      }
    } else {
      workspaceIndex.addParsed(document.uri, text, parser.__symbolTable);
    }

    for (const error of parser.errors) {
      console.error(
        `onDidChangeContent(): Error parsing document: ${error.name}`,
      );
    }

    // Create diagnostics in a single pass
    const diagnostics = createDiagnostics(parser, document);

    // Run cross-file validation (skip for multidoc — already done internally)
    if (!parser.isMultidoc && features.crossFileValidation !== false && parser.__symbolTable?.references) {
      // `$db.<table>.<column>` accessor chains aren't captured as references by
      // the grammar, so scan them from the token stream and validate alongside
      // the parser-emitted references (table + column existence).
      const dbRefs = scanDbReferences(lexResult.tokens);
      const crossFileWarnings = crossFileValidate(
        [...parser.__symbolTable.references, ...dbRefs],
        workspaceIndex,
      );
      for (const warning of crossFileWarnings) {
        diagnostics.push({
          severity: SEVERITY.WARNING,
          range: {
            start: document.positionAt(warning.startOffset),
            end: document.positionAt(warning.endOffset + 1),
          },
          message: warning.message,
        });
      }
    }

    // Run variable validation (skip for multidoc — already done per-segment internally)
    if (!parser.isMultidoc && features.variableValidation !== false && parser.__symbolTable?.varDeclarations) {
      const varResult = validateVariables(
        parser.__symbolTable,
        lexResult.tokens,
      );
      for (const warning of varResult.warnings) {
        diagnostics.push({
          severity: SEVERITY.WARNING,
          range: {
            start: document.positionAt(warning.startOffset),
            end: document.positionAt(warning.endOffset + 1),
          },
          message: warning.message,
        });
      }
      for (const hint of varResult.hints) {
        diagnostics.push({
          severity: SEVERITY.HINT,
          range: {
            start: document.positionAt(hint.startOffset),
            end: document.positionAt(hint.endOffset + 1),
          },
          message: hint.message,
        });
      }
    }

    console.log(
      `onDidChangeContent(): sending diagnostic (${parser.errors.length} errors) for scheme:`,
      scheme,
    );

    connection.sendDiagnostics({
      uri: document.uri,
      diagnostics,
    });
  } catch (error) {
    // If parsing fails, create a diagnostic (error message) to display in VS Code
    const diagnostics = [
      {
        severity: 1, // Error severity
        range: {
          start: { line: 0, character: 0 }, // Adjust range based on error details if available
          end: { line: 0, character: 1 },
        },
        message: error.message || "Syntax error in XanoScript code",
      },
    ];
    connection.sendDiagnostics({ uri: document.uri, diagnostics });
  }
}
