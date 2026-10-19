import { EqualToken } from "../../lexer/control.js";
import {
  SingleQuotedStringLiteral,
  StringLiteral,
} from "../../lexer/literal.js";
import { AnnotationsToken, IconsToken, TitleToken } from "../../lexer/mcp.js";
import { MultiLineStringToken } from "../../lexer/multiline.js";

// Shared MCP metadata blocks for `tool`, `prompt` and `resource` (MCP spec
// 2026-07-28). The rules mirror the Xano backend's decode checks so the editor
// reports what a push would refuse:
//   - `redacted` (icons, tool annotations)
//   - `helper/script/transform/redacted` (resource annotations)

export const ICON_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ICON_URL_MAX_LENGTH = 2048;
export const ICON_DATA_MAX_BYTES = 65536;
export const RESOURCE_AUDIENCES = ["user", "assistant"];

const ICON_SCHEMA = {
  src: "[string]",
  // validated below: the Xano backend compares it lowercased and allows ""
  "mime_type?": "[string]",
  "sizes?": ["[string]"],
  "theme?": ["light", "dark"],
};

const ISO_8601 =
  /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * The value of a token that `[string]` accepts ("...", '...' or a """ block),
 * or null for anything else (an expression, a variable).
 * @param {import('chevrotain').IToken} [token]
 * @returns {string|null}
 */
function stringValue(token) {
  switch (token?.tokenType) {
    case StringLiteral:
    case SingleQuotedStringLiteral:
      return token.image.slice(1, -1);
    case MultiLineStringToken:
      return token.image.slice(3, -3).trim();
    default:
      return null;
  }
}

/**
 * Why an icon `src` is refused, or null. Same rules as redacted:
 * `https:` or a base64 `data:` URI of png/jpeg/webp. SVG and every other scheme
 * (`http:`, `javascript:`, `file:`, ...) are refused.
 * @param {string} src
 * @returns {string|null}
 */
export function iconSrcProblem(src) {
  const lower = src.toLowerCase();

  if (lower.startsWith("https://")) {
    if (src.length > ICON_URL_MAX_LENGTH) {
      return `icon src is longer than ${ICON_URL_MAX_LENGTH} characters`;
    }
    let host = "";
    try {
      host = new URL(src).hostname;
    } catch {
      host = "";
    }
    if (!host || /\s/.test(src)) {
      return "icon src is not a valid https URL";
    }
    return null;
  }

  if (lower.startsWith("data:")) {
    const match = src.match(/^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/]*={0,2})$/i);
    if (!match) {
      return "icon data: src must be base64 image data";
    }
    const mime = match[1].toLowerCase();
    if (!ICON_MIME_TYPES.includes(mime)) {
      return `icon data: src must be ${ICON_MIME_TYPES.join(", ")} — got "${mime}"`;
    }
    const payload = match[2];
    if (payload.length === 0) {
      return "icon data: src must be base64 image data";
    }
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    if ((payload.length * 3) / 4 - padding > ICON_DATA_MAX_BYTES) {
      return `icon data: src is larger than ${ICON_DATA_MAX_BYTES} bytes`;
    }
    return null;
  }

  const scheme = src.includes(":") ? src.split(":")[0] + ":" : src.slice(0, 20);
  return `icon src must be https: or a data: image — got "${scheme}"`;
}

/**
 * title = "Human readable name"
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mcpTitleClause($) {
  return () => {
    $.sectionStack.push("mcpTitleClause");
    $.CONSUME(TitleToken); // "title"
    $.CONSUME(EqualToken); // "="
    const value = $.CONSUME(StringLiteral); // "..."
    if (value.image === `""`) {
      $.addMissingError(value, "title cannot be empty");
    }
    $.sectionStack.pop();
  };
}

/**
 * icons = [{ src: "https://...", mime_type: "image/png", sizes: ["48x48"], theme: "light" }]
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mcpIconsClause($) {
  return () => {
    $.sectionStack.push("mcpIconsClause");
    const parent = $.CONSUME(IconsToken); // "icons"
    $.CONSUME(EqualToken); // "="

    const captured = {};
    $.SUBRULE($.schemaParseArrayFn, { ARGS: [parent, [ICON_SCHEMA], captured] });

    $.ACTION(() => {
      for (const icon of captured.value || []) {
        const srcToken = icon.src?.value;
        const src = stringValue(srcToken);
        if (src !== null) {
          const problem = iconSrcProblem(src);
          if (problem) {
            $.addInvalidValueError(srcToken, problem);
          }
        }

        const mimeToken = icon.mime_type?.value;
        const mime = stringValue(mimeToken);
        if (mime !== null) {
          if (mime !== "" && !ICON_MIME_TYPES.includes(mime.toLowerCase())) {
            $.addInvalidValueError(
              mimeToken,
              `icon mime_type must be one of ${ICON_MIME_TYPES.join(", ")} — got "${mime}"`,
            );
          }
        }

        for (const size of icon.sizes?.value || []) {
          const sizeToken = size?.value;
          const value = stringValue(sizeToken);
          if (value === null) continue;
          if (!/^(\d{1,5}x\d{1,5}|any)$/.test(value)) {
            $.addInvalidValueError(
              sizeToken,
              `icon size must be WxH or "any" — got "${value}"`,
            );
          }
        }
      }
    });
    $.sectionStack.pop();
  };
}

/**
 * annotations = { read_only_hint: true, destructive_hint: false, ... } (tool)
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mcpToolAnnotationsClause($) {
  return () => {
    $.sectionStack.push("mcpToolAnnotationsClause");
    const parent = $.CONSUME(AnnotationsToken); // "annotations"
    $.CONSUME(EqualToken); // "="
    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [
        parent,
        {
          "read_only_hint?": "[boolean]",
          "destructive_hint?": "[boolean]",
          "idempotent_hint?": "[boolean]",
          "open_world_hint?": "[boolean]",
        },
      ],
    });
    $.sectionStack.pop();
  };
}

/**
 * annotations = { audience: ["user"], priority: 0.5, last_modified: "2025-01-12T15:00:58Z" } (resource)
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export function mcpResourceAnnotationsClause($) {
  return () => {
    $.sectionStack.push("mcpResourceAnnotationsClause");
    const parent = $.CONSUME(AnnotationsToken); // "annotations"
    $.CONSUME(EqualToken); // "="

    const captured = {};
    $.SUBRULE($.schemaParseObjectFn, {
      ARGS: [
        parent,
        {
          "audience?": ["[string]"],
          "priority?": "[number]",
          "last_modified?": "[string]",
        },
        captured,
      ],
    });

    $.ACTION(() => {
      for (const role of captured.audience?.value || []) {
        const roleToken = role?.value;
        const value = stringValue(roleToken);
        if (value === null) continue;
        if (!RESOURCE_AUDIENCES.includes(value)) {
          $.addInvalidValueError(
            roleToken,
            `resource annotation audience must be user or assistant — got "${value}"`,
          );
        }
      }

      const priorityToken = captured.priority?.value;
      if (priorityToken) {
        const priority = Number(priorityToken.image);
        if (Number.isFinite(priority) && (priority < 0 || priority > 1)) {
          $.addInvalidValueError(
            priorityToken,
            `resource annotation priority must be from 0 to 1 — got ${priorityToken.image}`,
          );
        }
      }

      const modifiedToken = captured.last_modified?.value;
      const value = stringValue(modifiedToken);
      if (value !== null) {
        if (!ISO_8601.test(value) || Number.isNaN(Date.parse(value))) {
          $.addInvalidValueError(
            modifiedToken,
            `resource annotation last_modified must be an ISO 8601 date, e.g. "2025-01-12T15:00:58Z"`,
          );
        }
      }
    });
    $.sectionStack.pop();
  };
}
