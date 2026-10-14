import { lexDocument } from "../lexer/lexer.js";
import { multidocParser, splitMultidoc } from "../parser/multidoc.js";
import { xanoscriptParser } from "../parser/parser.js";
import { policyCatalogueVersion } from "../parser/policy/catalogue.js";
import { getSchemeFromContent } from "../utils.js";

/**
 * Cache for parsed documents to avoid redundant parsing.
 * Stores parse results keyed by document URI + version.
 * Note: We cache a snapshot of parser state, not the parser instance itself,
 * since the parser is a singleton that gets mutated on each parse.
 *
 * lexResult (token arrays) are NOT cached to reduce memory footprint.
 * Lexing is fast (~1ms) and can be repeated when needed.
 */
class DocumentCache {
  constructor() {
    // Map<uri, { version: number, textLength: number, parserState: Object, scheme: string }>
    this.cache = new Map();
  }

  /**
   * Get cached parse result or parse and cache if not available.
   * @param {string} uri - Document URI
   * @param {number} version - Document version
   * @param {string} text - Document text
   * @returns {{ lexResult: Object, parser: Object, scheme: string }}
   */
  getOrParse(uri, version, text) {
    const cached = this.cache.get(uri);
    const textLength = text.length;
    // A policy's diagnostics depend on the check catalogue as well as the text.
    const catalogueVersion = policyCatalogueVersion();

    // Check version and text length to detect same URI with different content (e.g., in tests)
    if (
      cached &&
      cached.version === version &&
      cached.textLength === textLength &&
      cached.catalogueVersion === catalogueVersion
    ) {
      return {
        lexResult: cached.scheme === "multidoc" ? { tokens: [] } : lexDocument(text),
        parser: cached.parserState,
        scheme: cached.scheme,
      };
    }

    // Multidoc detection — split with splitMultidoc (a `---` line outside a triple-quoted string)
    const segments = splitMultidoc(text);
    if (segments.length > 1) {
      const parserState = multidocParser(text, segments);
      const cacheEntry = {
        version,
        textLength,
        catalogueVersion,
        parserState,
        scheme: "multidoc",
      };
      this.cache.set(uri, cacheEntry);
      return {
        lexResult: { tokens: [] },
        parser: parserState,
        scheme: "multidoc",
      };
    }

    // Parse and cache a snapshot of the parser state
    const scheme = getSchemeFromContent(text);
    const lexResult = lexDocument(text);
    const parser = xanoscriptParser(text, scheme, lexResult);

    // Snapshot only the parser state we need - not the token arrays.
    // Use structured clone to avoid retaining references to parser internals.
    const parserState = {
      errors: parser.errors.map((e) => ({
        message: e.message,
        token: e.token
          ? {
              startOffset: e.token.startOffset,
              endOffset: e.token.endOffset,
            }
          : null,
      })),
      warnings: parser.warnings.map((w) => ({
        message: w.message,
        token: w.token
          ? {
              startOffset: w.token.startOffset,
              endOffset: w.token.endOffset,
            }
          : null,
      })),
      informations: parser.informations.map((i) => ({
        message: i.message,
        token: i.token
          ? {
              startOffset: i.token.startOffset,
              endOffset: i.token.endOffset,
            }
          : null,
      })),
      hints: parser.hints.map((h) => ({
        message: h.message,
        token: h.token
          ? {
              startOffset: h.token.startOffset,
              endOffset: h.token.endOffset,
            }
          : null,
      })),
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

    const cacheEntry = {
      version,
      textLength,
      catalogueVersion,
      parserState,
      scheme,
    };

    this.cache.set(uri, cacheEntry);

    return {
      lexResult,
      parser: parserState,
      scheme,
    };
  }

  /**
   * Invalidate cache for a document.
   * @param {string} uri - Document URI
   */
  invalidate(uri) {
    this.cache.delete(uri);
  }

  /**
   * Clear all cached documents.
   */
  clear() {
    this.cache.clear();
  }
}

export const documentCache = new DocumentCache();
