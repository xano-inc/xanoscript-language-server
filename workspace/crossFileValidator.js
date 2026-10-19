/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Find the closest match from candidates using prefix check + edit distance.
 */
function findClosestMatch(input, candidates) {
  const inputLower = input.toLowerCase();

  // Prefix match: if input is a prefix of exactly one candidate, suggest it
  const prefixMatches = candidates.filter((c) =>
    c.toLowerCase().startsWith(inputLower)
  );
  if (prefixMatches.length === 1) return prefixMatches[0];

  // Levenshtein fallback
  const maxDistance = Math.max(3, Math.floor(input.length / 2));
  let best = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = levenshtein(inputLower, candidate.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return bestDist <= maxDistance ? best : null;
}

/**
 * Validate cross-file references against the workspace index.
 * @param {Array<{refType: string, name: string, startOffset: number, endOffset: number}>} references
 * @param {import('./workspaceIndex.js').WorkspaceIndex} index
 * @returns {Array<{message: string, startOffset: number, endOffset: number}>} warnings
 */
export function crossFileValidate(references, index) {
  if (!references || references.length === 0) return [];

  const warnings = [];
  for (const ref of references) {
    if (!ref.name) {
      warnings.push({
        message: `Empty ${ref.refType} reference`,
        startOffset: ref.startOffset,
        endOffset: ref.endOffset,
      });
      continue;
    }

    if (!index.has(ref.refType, ref.name)) {
      let message = `Unknown ${ref.refType} "${ref.name}"`;
      const allNames = index.getAllNames(ref.refType);
      const suggestion = findClosestMatch(ref.name, allNames);
      if (suggestion) {
        message += `. Did you mean "${suggestion}"?`;
      }
      warnings.push({
        message,
        startOffset: ref.startOffset,
        endOffset: ref.endOffset,
      });
      continue;
    }

    // Validate field_name against table columns
    if (ref.refType === "table" && ref.fieldName) {
      const entry = index.get(ref.refType, ref.name);
      const columns = entry?.inputs;
      if (columns && Object.keys(columns).length > 0) {
        const columnNames = Object.keys(columns);
        if (!columnNames.includes(ref.fieldName)) {
          let message = `Unknown column "${ref.fieldName}" in table "${ref.name}"`;
          const suggestion = findClosestMatch(ref.fieldName, columnNames);
          if (suggestion) {
            message += `. Did you mean "${suggestion}"?`;
          }
          warnings.push({
            message,
            startOffset: ref.fieldNameStartOffset ?? ref.startOffset,
            endOffset: ref.fieldNameEndOffset ?? ref.endOffset,
          });
        }
      }
    }

    // Validate data keys against table columns
    if (ref.refType === "table" && ref.dataKeys) {
      const entry = index.get(ref.refType, ref.name);
      const columns = entry?.inputs;
      if (columns && Object.keys(columns).length > 0) {
        const columnNames = Object.keys(columns);
        for (const dk of ref.dataKeys) {
          if (!columnNames.includes(dk.name)) {
            let message = `Unknown column "${dk.name}" in table "${ref.name}"`;
            const suggestion = findClosestMatch(dk.name, columnNames);
            if (suggestion) {
              message += `. Did you mean "${suggestion}"?`;
            }
            warnings.push({
              message,
              startOffset: dk.startOffset ?? ref.startOffset,
              endOffset: dk.endOffset ?? ref.endOffset,
            });
          }
        }
      }
    }

    // Validate input keys if args are present
    if (ref.args) {
      const entry = index.get(ref.refType, ref.name);
      const declaredInputs = entry?.inputs;
      if (!declaredInputs || Object.keys(declaredInputs).length === 0) continue;

      const declaredKeys = Object.keys(declaredInputs);
      for (const [argName, argInfo] of Object.entries(ref.args)) {
        if (!(argName in declaredInputs)) {
          let message = `Unknown input "${argName}" for ${ref.refType} "${ref.name}"`;
          const suggestion = findClosestMatch(argName, declaredKeys);
          if (suggestion) {
            message += `. Did you mean "${suggestion}"?`;
          }
          warnings.push({
            message,
            startOffset: argInfo?.startOffset ?? ref.startOffset,
            endOffset: argInfo?.endOffset ?? ref.endOffset,
          });
        } else if (argInfo?.type) {
          // Type check: compare literal type against declared type
          const declared = declaredInputs[argName];
          const isEnumWithText =
            declared?.type === "enum" && argInfo.type === "text";
          if (
            declared?.type &&
            declared.type !== argInfo.type &&
            !isEnumWithText
          ) {
            warnings.push({
              message: `Type mismatch for input "${argName}": expected ${declared.type}, got ${argInfo.type}`,
              startOffset: argInfo?.startOffset ?? ref.startOffset,
              endOffset: argInfo?.endOffset ?? ref.endOffset,
            });
          }
        }
      }
    }
  }
  return warnings;
}
