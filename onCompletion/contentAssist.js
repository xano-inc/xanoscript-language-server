import { PipeToken } from "../lexer/control.js";
import { lexDocument } from "../lexer/lexer.js";
import { mapTokenToType } from "../lexer/tokens.js";
import { FilterMessageProvider } from "../onHover/FilterMessageProvider.js";
import { encodeTokenType } from "../onSemanticCheck/tokens.js";
import { filterNames } from "../parser/generic/filterNames.js";
import { parser } from "../parser/parser.js";
import { getPolicyCompletions } from "./policyCompletion.js";

// FIXME: this should be imported from the onHover/FilterMessageProvider.js
const filterDocsMarkdown = `
# upper
Convert text to uppercase

# lower
Convert text to lowercase

# trim
Remove whitespace from the beginning and end of a string

# count
Get the number of elements in an array or characters in a string

# first
Get the first element of an array

# last
Get the last element of an array

# reverse
Reverse the order of elements in an array

# sin
Calculate the sine of a number (in radians)

# cos
Calculate the cosine of a number (in radians)

# floor
Round a number down to the nearest integer

# ceil
Round a number up to the nearest integer

# round
Round a number to the nearest integer

# concat
Concatenate strings together

# length
Get the length of a string or array

# split
Split a string into an array based on a delimiter

# join
Join array elements into a string with a separator

# push
Add an element to the end of an array

# pop
Remove and return the last element from an array

# unique
Remove duplicate values from an array

# sort
Sort an array in ascending order

# filter_empty
Remove empty values from an array

# flatten
Flatten a nested array structure

# merge
Merge two arrays together

# abs
Get the absolute value of a number

# max
Get the maximum value from an array of numbers

# min
Get the minimum value from an array of numbers

# sum
Calculate the sum of numbers in an array

# avg
Calculate the average of numbers in an array
`;

// Create a filter message provider instance to access filter documentation
const filterMessageProvider = new FilterMessageProvider(filterDocsMarkdown);

export function suggestable(suggestion) {
  // token without label are not suggested for auto-completion
  return !!suggestion.nextTokenType.LABEL;
}

function isAfterPipeToken(tokens) {
  if (tokens.length === 0) return false;

  // Check if the last token is a pipe token
  const lastToken = tokens[tokens.length - 1];
  return lastToken.tokenType === PipeToken;
}

// Pre-computed filter suggestions - frozen to prevent accidental mutations
const filterSuggestions = Object.freeze(
  filterNames.map((filterName) => {
    const documentation = filterMessageProvider.__filterDoc[filterName];

    return Object.freeze({
      label: filterName,
      kind: encodeTokenType("function"), // Filters are function-like
      documentation: documentation
        ? Object.freeze({
            kind: "markdown",
            value: documentation,
          })
        : undefined,
    });
  })
);

// Maximum number of tokens to pass to computeContentAssist.
// Chevrotain's content assist has exponential complexity with complex grammars;
// beyond this threshold it can consume gigabytes of memory and OOM the process.
const MAX_CONTENT_ASSIST_TOKENS = 40;

export function getContentAssistSuggestions(text, scheme) {
  // A policy is read with a tolerant scanner and the check catalogue, not content assist.
  if (scheme === "policy") {
    return getPolicyCompletions(text);
  }

  try {
    const lexResult = lexDocument(text);

    const partialTokenVector = lexResult.tokens;

    // Check if we're after a pipe token - if so, suggest filters
    if (isAfterPipeToken(partialTokenVector)) {
      return filterSuggestions;
    }

    // Skip computeContentAssist for large token vectors to prevent OOM.
    // Chevrotain explores all possible parse paths which grows exponentially
    // with deeply nested grammars (e.g., arrays inside function blocks).
    if (partialTokenVector.length > MAX_CONTENT_ASSIST_TOKENS) {
      return [];
    }

    const ruleNameByScheme = {
      db: "tableDeclaration",
      api: "queryDeclaration",
      function: "functionDeclaration",
      task: "taskDeclaration",
    };

    const ruleName = ruleNameByScheme[scheme];
    if (!ruleName) {
      return [];
    }

    parser.reset();
    const syntacticSuggestions = parser.computeContentAssist(
      ruleName,
      partialTokenVector
    );

    // The suggestions also include the context, we are only interested
    // in the TokenTypes in this example.
    const tokenTypesSuggestions = syntacticSuggestions
      .filter(suggestable)
      .map((suggestion) => {
        const tokenType = mapTokenToType(suggestion.nextTokenType.name);
        return {
          label: suggestion.nextTokenType.LABEL,
          kind: encodeTokenType(tokenType),
        };
      });

    return tokenTypesSuggestions;
  } catch (e) {
    console.error(e);
    return [];
  }
}
