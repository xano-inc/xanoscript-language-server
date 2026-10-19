import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createConnection,
  SemanticTokensBuilder,
  TextDocuments,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import { onCompletion } from "./onCompletion/onCompletion.js";
import { onDidChangeContent } from "./onDidChangeContent/onDidChangeContent.js";
import { onHover } from "./onHover/onHover.js";
import { onSemanticCheck } from "./onSemanticCheck/onSemanticCheck.js";
import { TOKEN_TYPES } from "./onSemanticCheck/tokens.js";
import pkg from "./package.json" with { type: "json" };
import { setPolicyCatalogue } from "./parser/policy/catalogue.js";
import policyCatalogueSnapshot from "./parser/policy/catalogueSnapshot.js";

// Policy rules are checked against the check catalogue this package was built with (see
// scripts/gen-policy-catalogue.mjs); what it finds is a warning, since the instance may be newer.
setPolicyCatalogue(policyCatalogueSnapshot, { source: "snapshot" });

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);
const connection = createConnection(messageReader, messageWriter);

const documents = new TextDocuments(TextDocument);

// init connection
connection.onInitialize(() => {
  return {
    capabilities: {
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [".", ":", "$", "|"],
      },
      textDocumentSync: 1,
      semanticTokensProvider: {
        legend: {
          tokenTypes: TOKEN_TYPES,
          tokenModifiers: [],
        },
        full: true,
      },
      hoverProvider: true,
    },
  };
});

connection.onHover((params) => onHover(params, documents));
connection.onCompletion((params) => onCompletion(params, documents));
connection.onRequest("textDocument/semanticTokens/full", (params) =>
  onSemanticCheck(params, documents, SemanticTokensBuilder)
);
documents.onDidChangeContent((params) =>
  onDidChangeContent(params, connection)
);
connection.onInitialized(() => console.log(`XanoScript Language Server v${pkg.version}`));
documents.listen(connection);
connection.listen();
