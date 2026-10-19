import { lexDocument } from "../lexer/lexer.js";
import { mapTokenToType } from "../lexer/tokens.js";
import { encodeTokenType } from "./tokens.js";

/**
 *
 * @param {string} scheme The scheme of the document (db:/, task:/, api:/...)
 * @param {string} text The source code to be highlighted
 * @param {SemanticTokensBuilder} SemanticTokensBuilder The semantic tokens builder constructor for node or browser
 * @returns {SemanticTokensBuilder} Returns null if the scheme is not supported
 */
export function higlightText(scheme, text, SemanticTokensBuilder) {
  return higlightDefault(text, 0, SemanticTokensBuilder);
}

/**
 * Highlight a multidoc by highlighting each segment independently.
 * @param {Array<{text: string, globalOffset: number}>} segments - The segments from multidocParser
 * @param {SemanticTokensBuilder} SemanticTokensBuilder - The semantic tokens builder constructor
 */
/**
 * Highlight a multidoc by highlighting each segment independently.
 * @param {Array<{text: string, globalOffset: number}>} segments - The segments from multidocParser
 * @param {SemanticTokensBuilder} SemanticTokensBuilder - The semantic tokens builder constructor
 */
export function higlightSegments(segments, SemanticTokensBuilder) {
  const builder = new SemanticTokensBuilder();

  // Pre-compute line offsets: count newlines in each previous segment + separator
  let lineOffset = 0;

  for (const segment of segments) {
    const lexResult = lexDocument(segment.text, true);

    for (const token of lexResult.tokens) {
      const tokenType = mapTokenToType(token.tokenType.name);
      if (tokenType) {
        builder.push(
          token.startLine - 1 + lineOffset,
          token.startColumn - 1,
          token.image.length,
          encodeTokenType(tokenType),
          0,
        );
      }
    }

    // Advance lineOffset: lines in this segment's text + 2 for the \n---\n separator
    // (separator has 2 newlines: one before --- and one after)
    const segmentLines = segment.text.split("\n").length - 1;
    lineOffset += segmentLines + 2;
  }

  return builder.build();
}

function higlightDefault(text, lineOffset, SemanticTokensBuilder) {
  const builder = new SemanticTokensBuilder();

  // Map Chevrotain tokens to semantic token types
  // Enable disabled statements
  const lexResult = lexDocument(text, true);

  lexResult.tokens.forEach((token) => {
    const tokenType = mapTokenToType(token.tokenType.name);
    if (tokenType) {
      const line = token.startLine - 1 + lineOffset;
      const character = token.startColumn - 1;
      builder.push(
        line,
        character,
        token.image.length, // Length of the token
        encodeTokenType(tokenType), // Numeric ID for the token type
        0, // No modifiers for now
      );
    } else if (tokenType === undefined) {
      console.log(
        `token type not mapped to a type: ${JSON.stringify(
          token.tokenType.name,
        )}`,
      );
    }
  });

  return builder.build();
}
