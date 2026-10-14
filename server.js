import { readdirSync, readFileSync } from "fs";
import { extname, join } from "path";
import { setImmediate } from "timers";
import { fileURLToPath, pathToFileURL } from "url";
import {
  createConnection,
  ProposedFeatures,
  SemanticTokensBuilder,
  TextDocuments,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { documentCache } from "./cache/documentCache.js";
import { onCompletion } from "./onCompletion/onCompletion.js";
import { findDefinition } from "./onDefinition/onDefinition.js";
import { onDidChangeContent } from "./onDidChangeContent/onDidChangeContent.js";
import { onHover } from "./onHover/onHover.js";
import { onSemanticCheck } from "./onSemanticCheck/onSemanticCheck.js";
import { TOKEN_TYPES } from "./onSemanticCheck/tokens.js";
import { xanoscriptParser } from "./parser/parser.js";
import { setPolicyCatalogue } from "./parser/policy/catalogue.js";
import policyCatalogueSnapshot from "./parser/policy/catalogueSnapshot.js";
import { getSchemeFromContent } from "./utils.js";
import { workspaceIndex } from "./workspace/workspaceIndex.js";

// Feature toggles for debugging memory issues.
// Disable one at a time to isolate the culprit.
const FEATURES = {
  workspaceScan: true, // initial .xs file scan on startup
  fileWatcher: true, // onDidChangeWatchedFiles
  completion: true, // onCompletion (content assist)
  semanticTokens: true, // semantic highlighting
  hover: true, // onHover
  definition: true, // onDefinition (go-to-definition)
  diagnostics: true, // onDidChangeContent (parse + diagnostics)
  crossFileValidation: true, // cross-file reference validation
  variableValidation: true, // variable usage validation
};

// Policy rules are checked against the check catalogue this package was built with (see
// scripts/gen-policy-catalogue.mjs); what it finds is a warning, since the instance may be newer.
setPolicyCatalogue(policyCatalogueSnapshot, { source: "snapshot" });

// Create a connection to the VS Code client
const connection = createConnection(ProposedFeatures.all);

// Manage open text documents
export const documents = new TextDocuments(TextDocument);

// Initialize the server
connection.onInitialize((params) => {
  connection.console.log("XanoScript Language Server initialized");

  // Scan workspace for .xs files to populate the index
  if (FEATURES.workspaceScan) {
    if (params.workspaceFolders) {
      for (const folder of params.workspaceFolders) {
        scanWorkspaceFolder(folder.uri);
      }
    } else if (params.rootUri) {
      scanWorkspaceFolder(params.rootUri);
    }
  }

  return {
    capabilities: {
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [".", ":", "$", "|"],
      },
      textDocumentSync: 1,
      semanticTokensProvider: {
        documentSelector: [{ language: "xanoscript" }],
        legend: {
          tokenTypes: TOKEN_TYPES,
          tokenModifiers: [],
        },
        full: true,
      },
      hoverProvider: true,
      definitionProvider: true,
      workspace: {
        workspaceFolders: {
          supported: true,
        },
      },
    },
  };
});

/**
 * Recursively scan a folder for .xs files and add them to the workspace index.
 * Uses lightweight regex-only indexing (no parsing) and yields to the event loop
 * in batches to avoid blocking and allow GC to run.
 * @param {string} folderUri - file:// URI of the folder
 */
function scanWorkspaceFolder(folderUri) {
  try {
    const folderPath = fileURLToPath(folderUri);
    const filePaths = collectXsFiles(folderPath);
    indexFilesInBatches(filePaths);
  } catch (err) {
    connection.console.error(`Error scanning workspace: ${err.message}`);
  }
}

/**
 * Collect all .xs file paths recursively (fast, no parsing).
 */
function collectXsFiles(dirPath) {
  const result = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        stack.push(fullPath);
      } else if (entry.isFile() && extname(entry.name) === ".xs") {
        result.push(fullPath);
      }
    }
  }
  return result;
}

/** Number of files to index per event-loop tick */
const SCAN_BATCH_SIZE = 50;

/**
 * Index files in batches, yielding to the event loop between batches
 * so GC can run and the server stays responsive.
 */
function indexFilesInBatches(filePaths) {
  let offset = 0;
  function processBatch() {
    const end = Math.min(offset + SCAN_BATCH_SIZE, filePaths.length);
    for (let i = offset; i < end; i++) {
      try {
        const content = readFileSync(filePaths[i], "utf-8");
        const uri = pathToFileURL(filePaths[i]).toString();
        workspaceIndex.addFile(uri, content);
      } catch {
        // Skip unreadable files
      }
    }
    offset = end;
    if (offset < filePaths.length) {
      setImmediate(processBatch);
    }
  }
  if (filePaths.length > 0) {
    processBatch();
  }
}

connection.onDidChangeWatchedFiles((params) => {
  if (!FEATURES.fileWatcher) return;
  connection.console.log(`[FILEWATCHER] ${params.changes.length} changes`);
  for (const change of params.changes) {
    if (!change.uri.endsWith(".xs")) continue;
    switch (change.type) {
      case 3: // Deleted
        workspaceIndex.removeFile(change.uri);
        break;
      case 1: // Created
      case 2: // Changed (from external editor)
        try {
          const filePath = fileURLToPath(change.uri);
          const content = readFileSync(filePath, "utf-8");
          const scheme = getSchemeFromContent(content);
          const parser = xanoscriptParser(content, scheme);
          workspaceIndex.addParsed(change.uri, content, parser.__symbolTable);
        } catch {
          // Skip unreadable
        }
        break;
    }
  }
});

connection.onHover((params) => {
  if (!FEATURES.hover) return null;
  connection.console.log(
    `[HOVER] ${params.textDocument.uri} pos=${JSON.stringify(params.position)}`,
  );
  return onHover(params, documents);
});
connection.onCompletion((params) => {
  if (!FEATURES.completion) return null;
  connection.console.log(
    `[COMPLETION] ${params.textDocument.uri} pos=${JSON.stringify(params.position)}`,
  );
  return onCompletion(params, documents);
});
connection.onDefinition((params) => {
  if (!FEATURES.definition) return null;
  connection.console.log(`[DEFINITION] ${params.textDocument.uri}`);
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const cached = documentCache.getOrParse(document.uri, document.version, text);
  const symbolTable = cached.parser?.__symbolTable;
  const result = findDefinition(text, offset, workspaceIndex, symbolTable);

  if (!result) return null;

  // Same-file variable definition (has offset)
  if (result.offset != null) {
    const pos = document.positionAt(result.offset);
    return {
      uri: document.uri,
      range: { start: pos, end: pos },
    };
  }

  // Cross-file definition (has uri)
  return {
    uri: result.uri,
    range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  };
});
connection.onRequest("textDocument/semanticTokens/full", (params) => {
  if (!FEATURES.semanticTokens) return null;
  connection.console.log(`[SEMANTIC] ${params.textDocument.uri}`);
  return onSemanticCheck(params, documents, SemanticTokensBuilder);
});
documents.onDidChangeContent((params) => {
  if (!FEATURES.diagnostics) return;
  connection.console.log(
    `[DIAGNOSTICS] ${params.document.uri} v${params.document.version}`,
  );
  onDidChangeContent(params, connection, FEATURES);
});
documents.onDidClose((params) => {
  const uri = params.document.uri;
  documentCache.invalidate(uri);
});

// Bind the document manager to the connection and start listening
documents.listen(connection);
connection.listen();
