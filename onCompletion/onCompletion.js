import { documentCache } from "../cache/documentCache.js";
import { mapToVirtualJS } from "../embedded/embeddedContent.js";
import { findSegmentAtOffset } from "../parser/multidoc.js";
import { getSchemeFromContent } from "../utils.js";
import { workspaceIndex } from "../workspace/workspaceIndex.js";
import { getContentAssistSuggestions } from "./contentAssist.js";

/**
 *
 * @param {import('vscode-languageserver-protocol').CompletionParams} params
 * @param {import('vscode-languageserver').TextDocuments} documents
 * @returns
 */
export function onCompletion(params, documents) {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    console.error(
      "onCompletion(): Document not found for URI:",
      params.textDocument.uri
    );
    return null;
  }

  const position = params.position;
  const text = document.getText();
  const offset = document.offsetAt(position);

  // Check if we're in an embedded JavaScript region
  const virtualPos = mapToVirtualJS(offset, text);
  if (virtualPos) {
    // We're in embedded JS - return null to let VS Code's JS service handle it
    // The virtual document provider will expose the JS content
    return null;
  }

  // For multidoc, resolve to the correct segment
  const { parser } = documentCache.getOrParse(
    params.textDocument.uri,
    document.version,
    text,
  );

  let scheme;
  let prefix;
  let lineOffset = 0;

  if (parser.isMultidoc) {
    const match = findSegmentAtOffset(parser, offset);
    if (!match) return null;
    scheme = getSchemeFromContent(match.segment.text);
    // Prefix is everything in the full text up to the cursor — contentAssist
    // parses backwards from the cursor to find context, so it needs the segment
    // text up to the local offset
    prefix = match.segment.text.slice(0, match.localOffset);
    // A textEdit (policy completion) is in segment coordinates; a segment starts a line.
    lineOffset = document.positionAt(match.segment.globalOffset).line;
  } else {
    scheme = getSchemeFromContent(text);
    prefix = text.slice(0, offset);
  }

  const suggestions = shiftTextEdits(
    getContentAssistSuggestions(prefix, scheme),
    lineOffset
  );

  // Add workspace object name completions; a policy names no workspace object (its prose would
  // match the reference patterns).
  const workspaceCompletions = scheme === "policy" ? null : getWorkspaceCompletions(prefix);
  if (workspaceCompletions) {
    const existing = suggestions || [];
    return [...existing, ...workspaceCompletions];
  }

  return suggestions;
}

/**
 * Move each item's textEdit down by `lines`.
 * @param {Array|null} items
 * @param {number} lines
 */
function shiftTextEdits(items, lines) {
  if (!items || !lines) return items;
  return items.map((item) => {
    if (!item.textEdit) return item;
    const { start, end } = item.textEdit.range;
    return {
      ...item,
      textEdit: {
        ...item.textEdit,
        range: {
          start: { line: start.line + lines, character: start.character },
          end: { line: end.line + lines, character: end.character },
        },
      },
    };
  });
}

/**
 * Get completions for cross-file references based on cursor context.
 * @param {string} prefix - Text before cursor
 * @returns {Array|null} Completion items or null if not in a reference context
 */
function getWorkspaceCompletions(prefix) {
  // function.run " or function.call " context
  if (/function\.(run|call)\s+"[^"]*$/.test(prefix)) {
    return workspaceIndex.getAllNames("function").map((name) => ({
      label: name,
      kind: 3, // Function
      detail: "function",
    }));
  }

  // task.call " context
  if (/task\.call\s+"[^"]*$/.test(prefix)) {
    return workspaceIndex.getAllNames("task").map((name) => ({
      label: name,
      kind: 3,
      detail: "task",
    }));
  }

  // db.* table name context
  if (
    /\b(get|add|edit|delete|query|patch|increment|has|truncate|add_or_edit|schema)\s+("?[^"\s{]*$)/.test(
      prefix
    )
  ) {
    return workspaceIndex.getAllNames("table").map((name) => ({
      label: name,
      kind: 7, // Class (for table)
      detail: "table",
    }));
  }

  // api.call " context
  if (/api\.call\s+"[^"]*$/.test(prefix)) {
    return workspaceIndex.getAllNames("query").map((name) => ({
      label: name,
      kind: 3,
      detail: "query",
    }));
  }

  return null;
}
