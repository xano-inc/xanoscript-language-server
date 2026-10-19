import { lexDocument } from "../lexer/lexer.js";
import { MultiLineExpressionToken, MultiLineStringToken } from "../lexer/multiline.js";
import { crossFileValidate } from "../workspace/crossFileValidator.js";
import { WorkspaceIndex } from "../workspace/workspaceIndex.js";
import { scanDbReferences } from "./dbReferenceScanner.js";
import { xanoscriptParser } from "./parser.js";
import { validateVariables } from "./variableValidator.js";

/**
 * Where a triple-quoted string could run, found with the lexer's own patterns for `"""`, `'''` and
 * triple backticks rather than a full lex: in a lex, an ordinary string left open while typing
 * pairs with a quote in a later document and hides every separator after it.
 */
const TRIPLE_QUOTED = new RegExp(
  `${MultiLineStringToken.PATTERN.source}|${MultiLineExpressionToken.PATTERN.source}`,
  "g"
);

/**
 * Separate documents at each `---` line, as the platform does, except one inside a triple-quoted
 * string (a Markdown rule in a policy's narrative), which xanoscriptParser warns about: the
 * platform's multidoc push splits there.
 */
export function splitMultidoc(text) {
  const boundaries = [...text.matchAll(/\r?\n---[ \t]*\r?\n/g)];
  if (!boundaries.length) return [{ text, globalOffset: 0, lineOffset: 0 }];
  const quoted = /"""|'''|```/.test(text)
    ? [...text.matchAll(TRIPLE_QUOTED)].map((match) => [match.index, match.index + match[0].length])
    : [];
  const segments = [];
  let quotedIndex = 0;
  let globalOffset = 0;
  let lineOffset = 0;
  for (const boundary of boundaries) {
    const dash = boundary.index + (boundary[0].startsWith("\r") ? 2 : 1);
    while (quoted[quotedIndex]?.[1] <= dash) quotedIndex++;
    const range = quoted[quotedIndex];
    if (range && range[0] < dash && range[1] >= dash + 3) continue;
    const segmentText = text.slice(globalOffset, boundary.index);
    segments.push({ text: segmentText, globalOffset, lineOffset });
    lineOffset += (segmentText.match(/\n/g) || []).length + 2;
    globalOffset = boundary.index + boundary[0].length;
  }
  segments.push({ text: text.slice(globalOffset), globalOffset, lineOffset });
  return segments;
}

/**
 * Find the segment that contains the given global offset.
 * @param {Object} parserResult - The multidoc parser result (must have segments array)
 * @param {number} offset - Global character offset in the full document
 * @returns {{ segment: Object, localOffset: number } | null}
 */
export function findSegmentAtOffset(parserResult, offset) {
  if (!parserResult?.segments) return null;

  for (const segment of parserResult.segments) {
    const segEnd = segment.globalOffset + segment.text.length;
    if (offset >= segment.globalOffset && offset < segEnd) {
      return {
        segment,
        localOffset: offset - segment.globalOffset,
      };
    }
  }

  // Offset might be at the very end of the last segment
  const last = parserResult.segments[parserResult.segments.length - 1];
  if (last && offset === last.globalOffset + last.text.length) {
    return {
      segment: last,
      localOffset: offset - last.globalOffset,
    };
  }

  return null;
}

/**
 * Snapshot a Chevrotain token (or minimal token-like object) into a plain object.
 * @param {Object|null} token
 * @returns {Object|null}
 */
function snapshotToken(token) {
  if (!token) return null;
  return {
    startOffset: token.startOffset,
    endOffset: token.endOffset,
    startLine: token.startLine,
    startColumn: token.startColumn,
    image: token.image,
    tokenTypeName: token.tokenType?.name,
  };
}

/**
 * Snapshot parser state into a plain object.
 * Must be called immediately after xanoscriptParser() before parsing next segment,
 * because the parser is a singleton that gets mutated on each call.
 * @param {import('./base_parser.js').XanoBaseParser} parser
 * @returns {Object} Plain object snapshot
 */
function snapshotParser(parser) {
  return {
    errors: parser.errors.map((e) => ({
      message: e.message,
      token: snapshotToken(e.token),
      previousToken: snapshotToken(e.previousToken),
    })),
    warnings: parser.warnings.map((w) => ({
      message: w.message,
      token: snapshotToken(w.token),
    })),
    informations: parser.informations.map((i) => ({
      message: i.message,
      token: snapshotToken(i.token),
    })),
    hints: parser.hints.map((h) => ({
      message: h.message,
      token: snapshotToken(h.token),
    })),
    sectionStack: [...parser.sectionStack],
    __symbolTable: parser.__symbolTable
      ? {
          input: { ...parser.__symbolTable.input },
          var: { ...parser.__symbolTable.var },
          auth: { ...parser.__symbolTable.auth },
          env: { ...parser.__symbolTable.env },
          references: parser.__symbolTable.references.map((r) => ({
            ...r,
            args: r.args ? { ...r.args } : undefined,
            dataKeys: r.dataKeys ? [...r.dataKeys] : undefined,
          })),
          varDeclarations: parser.__symbolTable.varDeclarations.map((d) => ({
            ...d,
          })),
        }
      : null,
  };
}

/**
 * Apply a global offset to all position-bearing fields in a parser snapshot.
 * @param {Object} snapshot - The parser state snapshot
 * @param {number} globalOffset - The character offset to add
 * @param {number} lineOffset - The line number offset to add
 */
function offsetResult(snapshot, globalOffset, lineOffset) {
  if (globalOffset === 0) return;

  const offsetToken = (token) => {
    if (!token) return;
    token.startOffset += globalOffset;
    token.endOffset += globalOffset;
    if (token.startLine != null) {
      token.startLine += lineOffset;
    }
  };

  for (const err of snapshot.errors) {
    offsetToken(err.token);
    offsetToken(err.previousToken);
  }
  for (const warn of snapshot.warnings) offsetToken(warn.token);
  for (const info of snapshot.informations) offsetToken(info.token);
  for (const hint of snapshot.hints) offsetToken(hint.token);

  if (!snapshot.__symbolTable) return;

  for (const ref of snapshot.__symbolTable.references) {
    ref.startOffset += globalOffset;
    ref.endOffset += globalOffset;
    if (ref.fieldNameStartOffset != null) {
      ref.fieldNameStartOffset += globalOffset;
      ref.fieldNameEndOffset += globalOffset;
    }
    if (ref.args) {
      for (const arg of Object.values(ref.args)) {
        if (arg && arg.startOffset != null) {
          arg.startOffset += globalOffset;
          arg.endOffset += globalOffset;
        }
      }
    }
    if (ref.dataKeys) {
      for (const dk of ref.dataKeys) {
        if (dk.startOffset != null) {
          dk.startOffset += globalOffset;
          dk.endOffset += globalOffset;
        }
      }
    }
  }

  for (const decl of snapshot.__symbolTable.varDeclarations) {
    if (decl.startOffset != null) {
      decl.startOffset += globalOffset;
      decl.endOffset += globalOffset;
    }
  }
}

/**
 * Parse a multidoc or single-doc XanoScript text.
 * Splits with splitMultidoc (a `---` line outside a triple-quoted string). With one segment,
 * delegates to xanoscriptParser as-is; otherwise parses each segment, offsets positions, and
 * merges results.
 * @param {string} text - The full document text
 * @returns {Object} Merged parser result
 */
export function multidocParser(text, segments = splitMultidoc(text)) {
  if (segments.length === 1) {
    // Single document — delegate as-is
    const parser = xanoscriptParser(text);
    return snapshotParser(parser);
  }

  const results = [];

  for (const { text: segmentText, globalOffset, lineOffset } of segments) {
    const parser = xanoscriptParser(segmentText);
    const snapshot = snapshotParser(parser);

    // Variable validation with segment-local offsets and tokens
    const segLexResult = lexDocument(segmentText);

    // Capture `$db.<table>.<column>` accessor references (segment-local offsets);
    // offsetResult() will shift them to global coordinates like other references.
    if (snapshot.__symbolTable?.references) {
      snapshot.__symbolTable.references.push(
        ...scanDbReferences(segLexResult.tokens),
      );
    }

    if (snapshot.__symbolTable?.varDeclarations) {
      const varResult = validateVariables(
        snapshot.__symbolTable,
        segLexResult.tokens,
      );
      for (const warning of varResult.warnings) {
        snapshot.warnings.push({
          message: warning.message,
          token: {
            startOffset: warning.startOffset,
            endOffset: warning.endOffset,
          },
        });
      }
      for (const hint of varResult.hints) {
        snapshot.hints.push({
          message: hint.message,
          token: {
            startOffset: hint.startOffset,
            endOffset: hint.endOffset,
          },
        });
      }
    }

    // Save a copy of the segment's symbol table before offsetting (for workspace indexing and hover)
    const segmentSymbolTable = snapshot.__symbolTable
      ? { input: { ...snapshot.__symbolTable.input } }
      : null;
    // Deep-copy the snapshot before offsetResult mutates it (needed for hover providers)
    const localSnapshot = JSON.parse(JSON.stringify(snapshot));
    results.push({ snapshot, localSnapshot, segmentText, segmentSymbolTable, globalOffset, lineOffset });
  }

  // For now, merge without offsetting (next task)
  const merged = {
    errors: [],
    warnings: [],
    informations: [],
    hints: [],
    __symbolTable: {
      input: {},
      var: {},
      auth: {},
      env: {},
      references: [],
      varDeclarations: [],
    },
    isMultidoc: true,
    segmentCount: segments.length,
  };

  for (const { snapshot, globalOffset, lineOffset } of results) {
    offsetResult(snapshot, globalOffset, lineOffset);
    merged.errors.push(...snapshot.errors);
    merged.warnings.push(...snapshot.warnings);
    merged.informations.push(...snapshot.informations);
    merged.hints.push(...snapshot.hints);
    if (snapshot.__symbolTable) {
      merged.__symbolTable.references.push(
        ...snapshot.__symbolTable.references,
      );
      merged.__symbolTable.varDeclarations.push(
        ...snapshot.__symbolTable.varDeclarations,
      );
    }
  }

  // Build local workspace index from all segments for cross-reference validation
  const localIndex = new WorkspaceIndex();
  for (let i = 0; i < results.length; i++) {
    const { segmentText, segmentSymbolTable } = results[i];
    localIndex.addParsed(`multidoc#${i}`, segmentText, segmentSymbolTable);
  }

  // Validate references against local index only (self-contained)
  if (merged.__symbolTable.references.length > 0) {
    const crossRefWarnings = crossFileValidate(
      merged.__symbolTable.references,
      localIndex,
    );
    for (const warning of crossRefWarnings) {
      merged.warnings.push({
        message: warning.message,
        token: {
          startOffset: warning.startOffset,
          endOffset: warning.endOffset,
        },
      });
    }
  }

  // Store segment info for workspace indexing and hover support
  merged.segments = results.map(({ segmentText, segmentSymbolTable, localSnapshot, globalOffset }) => ({
    text: segmentText,
    symbolTable: segmentSymbolTable,
    parser: localSnapshot,
    globalOffset,
  }));

  return merged;
}
