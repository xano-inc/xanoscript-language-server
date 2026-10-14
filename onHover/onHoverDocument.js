import { documentCache } from "../cache/documentCache.js";
import { lexDocument } from "../lexer/lexer.js";
import { findSegmentAtOffset } from "../parser/multidoc.js";

/**
 * Binary search to find token index at the given offset.
 * Reduces complexity from O(n) to O(log n).
 * @param {Array} tokens - Array of tokens sorted by startOffset
 * @param {number} offset - Cursor offset position
 * @returns {number} Token index or -1 if not found
 */
function findTokenAtOffset(tokens, offset) {
  let left = 0;
  let right = tokens.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const token = tokens[mid];

    if (token.startOffset <= offset && token.endOffset >= offset) {
      return mid;
    } else if (token.endOffset < offset) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 *
 * @param {import('vscode-languageserver-protocol').HoverParams} params
 * @param {import('vscode-languageserver-textdocument').TextDocuments} documents
 * @returns
 */
export function onHoverDocument(params, documents, hoverProviders = []) {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    console.error(
      "onHover(): Document not found for URI:",
      params.textDocument.uri,
    );
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Get cached parse result or parse and cache
  const { lexResult, parser } = documentCache.getOrParse(
    params.textDocument.uri,
    document.version,
    text,
  );

  let tokens;
  let hoverParser;
  let tokenOffsetAdjustment = 0;

  if (parser.isMultidoc) {
    // For multidoc, find the segment at the cursor position and lex it
    const match = findSegmentAtOffset(parser, offset);
    if (!match) return null;

    const segLexResult = lexDocument(match.segment.text);
    if (segLexResult.errors.length > 0) return null;

    tokens = segLexResult.tokens;
    hoverParser = match.segment.parser;
    tokenOffsetAdjustment = match.segment.globalOffset;

    // Find token using segment-local offset
    const tokenIdx = findTokenAtOffset(tokens, match.localOffset);
    if (tokenIdx === -1) return null;

    const messageProvider = hoverProviders.find((provider) =>
      provider.isMatch(tokenIdx, tokens, hoverParser),
    );

    if (messageProvider) {
      return {
        contents: {
          kind: "markdown",
          value: messageProvider.render(tokenIdx, tokens, hoverParser),
        },
        range: {
          // Convert segment-local token offsets to global document positions
          start: document.positionAt(tokens[tokenIdx].startOffset + tokenOffsetAdjustment),
          end: document.positionAt(tokens[tokenIdx].endOffset + 1 + tokenOffsetAdjustment),
        },
      };
    }

    return null;
  }

  if (lexResult.errors.length > 0) return null;

  tokens = lexResult.tokens;

  // Find the token under the cursor using binary search (O(log n))
  const tokenIdx = findTokenAtOffset(tokens, offset);

  if (tokenIdx === -1) {
    return null;
  }

  // Find the hover provider that matches the token
  const messageProvider = hoverProviders.find((provider) =>
    provider.isMatch(tokenIdx, tokens, parser),
  );

  if (messageProvider) {
    return {
      contents: {
        kind: "markdown",
        value: messageProvider.render(tokenIdx, tokens, parser),
      },
      range: {
        start: document.positionAt(tokens[tokenIdx].startOffset),
        end: document.positionAt(tokens[tokenIdx].endOffset + 1),
      },
    };
  }

  return null;
}
