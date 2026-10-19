import { createUniqToken } from "./utils.js";

// Comment token - captures entire line comments starting with //
// Comments can only be on empty lines (nothing before the comment except whitespace)
export const CommentToken = createUniqToken({
  name: "CommentToken",
  label: "// comment",
  pattern: {
    exec: (text, offset) => {
      // Look for the `//` marker at the current offset
      if (text.charCodeAt(offset) !== 47 || text.charCodeAt(offset + 1) !== 47) {
        return null;
      }

      // Check that the comment is on its own line (only whitespace before it)
      if (offset > 0) {
        let checkOffset = offset - 1;
        while (checkOffset >= 0) {
          const char = text.charCodeAt(checkOffset);
          if (char === 10 || char === 13) break; // \n or \r → own line
          if (char !== 32 && char !== 9) return null; // not space/tab → reject
          checkOffset--;
        }
      }

      // Find end of line without allocating a substring
      let end = text.indexOf("\n", offset);
      if (end === -1) end = text.length;
      const match = text.slice(offset, end);
      return [match];
    },
  },
  // we don't capture more than one line
  line_breaks: false,
});

export const CommentTokens = [CommentToken];

/**
 * Map comment tokens to their semantic types
 * @param {string} tokenName - The name of the token
 * @returns {string|undefined} The semantic type
 */
export function mapTokenToType(tokenName) {
  switch (tokenName) {
    case CommentToken.name:
      return "comment";
    default:
      return undefined;
  }
}
