import { mapToVirtualJS } from "../embedded/embeddedContent.js";
import { FilterMessageProvider } from "./FilterMessageProvider.js";
import filtersMd from "./filters.md";
import { FunctionMessageProvider } from "./FunctionMessageProvider.js";
import functionsMd from "./functions.md";
import { InputFilterMessageProvider } from "./InputFilterMessageProvider.js";
import inputFiltersMd from "./inputFilters.md";
import { InputVariableMessageProvider } from "./InputVariableMessageProvider.js";
import { onHoverDocument } from "./onHoverDocument.js";
import { PolicyMessageProvider } from "./PolicyMessageProvider.js";
import { QueryFilterMessageProvider } from "./queryFilterMessageProvider.js";
import queryFiltersMd from "./queryFilters.md";

const hoverProviders = [
  new PolicyMessageProvider(), // Check ids and params in a policy, from the check catalogue
  new InputVariableMessageProvider(),
  new FunctionMessageProvider(functionsMd),
  new InputFilterMessageProvider(inputFiltersMd), // Input filters (columnDefinition context)
  new FilterMessageProvider(filtersMd), // Regular filters (pipe context)
  new QueryFilterMessageProvider(queryFiltersMd), // Query filters (search context)
];

export function onHover(params, documents) {
  const document = documents.get(params.textDocument.uri);

  if (!document) {
    return null;
  }

  // Check if we're in an embedded JavaScript region
  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const virtualPos = mapToVirtualJS(offset, text);

  if (virtualPos) {
    // We're in embedded JS - return null to let VS Code's JS service handle it
    return null;
  }

  // Otherwise, handle as regular XanoScript
  return onHoverDocument(params, documents, hoverProviders);
}
