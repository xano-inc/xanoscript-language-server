import { getObjectInfoFromContent } from "../utils.js";

/**
 * @typedef {Object} IndexEntry
 * @property {string} uri - Document URI
 * @property {string} type - Object type (function, table, query, task, etc.)
 * @property {string} name - Object name
 * @property {Object} [inputs] - Input parameters/columns from __symbolTable.input
 */

/**
 * In-memory index of all XanoScript objects in the workspace.
 * One entry per .xs file, keyed by (type, name).
 */
export class WorkspaceIndex {
  constructor() {
    /** @type {Map<string, Map<string, IndexEntry>>} type -> name -> entry */
    this.index = new Map();
    /** @type {Map<string, IndexEntry>} uri -> entry (reverse lookup) */
    this.byUri = new Map();
  }

  /**
   * @private
   * Insert an entry into the index maps.
   */
  _setEntry(entry) {
    const { type, name, uri } = entry;
    if (!this.index.has(type)) {
      this.index.set(type, new Map());
    }

    const existing = this.index.get(type).get(name);
    if (existing && existing.uri !== uri) {
      this.byUri.delete(existing.uri);
    }

    this.index.get(type).set(name, entry);
    this.byUri.set(uri, entry);
  }

  /**
   * Lightweight index: extract type+name via regex only (no parsing).
   * Used for initial workspace scan to avoid heavy memory usage.
   * Inputs will be populated later when the file is opened or parsed.
   * @param {string} uri - Document URI
   * @param {string} content - File content
   * @returns {boolean} true if successfully indexed
   */
  addFile(uri, content) {
    this.removeFile(uri);

    const info = getObjectInfoFromContent(content);
    if (!info) return false;

    const entry = { uri, type: info.type, name: info.name, inputs: {} };
    this._setEntry(entry);
    return true;
  }

  /**
   * Add or update a file in the index using pre-parsed data.
   * Avoids double-parsing when the caller already has the parse result.
   * @param {string} uri - Document URI
   * @param {string} content - File content (for name extraction)
   * @param {Object} symbolTable - Parser's __symbolTable
   * @returns {boolean} true if successfully indexed
   */
  addParsed(uri, content, symbolTable) {
    this.removeFile(uri);

    const info = getObjectInfoFromContent(content);
    if (!info) return false;

    const inputs = symbolTable?.input ? { ...symbolTable.input } : {};
    const entry = { uri, type: info.type, name: info.name, inputs };
    this._setEntry(entry);
    return true;
  }

  /**
   * Remove a file from the index.
   * @param {string} uri - Document URI
   */
  removeFile(uri) {
    const existing = this.byUri.get(uri);
    if (existing) {
      const typeMap = this.index.get(existing.type);
      if (typeMap) {
        typeMap.delete(existing.name);
        if (typeMap.size === 0) {
          this.index.delete(existing.type);
        }
      }
      this.byUri.delete(uri);
    }
  }

  /**
   * Get an index entry by type and name.
   * @param {string} type
   * @param {string} name
   * @returns {IndexEntry | undefined}
   */
  get(type, name) {
    return this.index.get(type)?.get(name);
  }

  /**
   * Check if an entry exists.
   * @param {string} type
   * @param {string} name
   * @returns {boolean}
   */
  has(type, name) {
    return this.index.get(type)?.has(name) ?? false;
  }

  /**
   * Get all entries for a given type.
   * @param {string} type
   * @returns {IndexEntry[]}
   */
  getByType(type) {
    const typeMap = this.index.get(type);
    return typeMap ? [...typeMap.values()] : [];
  }

  /**
   * Get all names for a given type.
   * @param {string} type
   * @returns {string[]}
   */
  getAllNames(type) {
    const typeMap = this.index.get(type);
    return typeMap ? [...typeMap.keys()] : [];
  }

  /**
   * Get entry by URI (reverse lookup).
   * @param {string} uri
   * @returns {IndexEntry | undefined}
   */
  getByUri(uri) {
    return this.byUri.get(uri);
  }
}

export const workspaceIndex = new WorkspaceIndex();
