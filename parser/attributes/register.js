import { activeFieldAttribute } from "./activeFieldAttribute.js";
import { columnDefaultValueAttribute } from "./columnDefaultValueAttribute.js";
import { descriptionFieldAttribute } from "./descriptionFieldAttribute.js";
import { disabledFieldAttribute } from "./disabledFieldAttribute.js";
import { docsFieldAttribute } from "./docsFieldAttribute.js";
import { guidFieldAttribute } from "./guidFieldAttribute.js";
import { inputFilterFn } from "./inputFilterFn.js";
import { sensitiveFieldAttribute } from "./sensitiveFieldAttribute.js";
import { valueFieldAttribute } from "./valueFieldAttribute.js";
import { valuesFieldAttribute } from "./valuesFieldAttribute.js";
import { visibilityFieldAttribute } from "./visibilityFieldAttribute.js";

/**
 * Registers all the parsers in this folder
 * @param {import('../base_parser.js').XanoBaseParser} $
 */
export const register = ($) => {
  $.activeFieldAttribute = $.RULE(
    "activeFieldAttribute",
    activeFieldAttribute($),
  );
  $.columnDefaultValueAttribute = $.RULE(
    "columnDefaultValueAttribute",
    columnDefaultValueAttribute($),
  );
  $.descriptionFieldAttribute = $.RULE(
    "descriptionFieldAttribute",
    descriptionFieldAttribute($),
  );
  $.disabledFieldAttribute = $.RULE(
    "disabledFieldAttribute",
    disabledFieldAttribute($),
  );
  $.docsFieldAttribute = $.RULE("docsFieldAttribute", docsFieldAttribute($));
  $.guidFieldAttribute = $.RULE("guidFieldAttribute", guidFieldAttribute($));
  $.inputFilterFn = $.RULE("inputFilterFn", inputFilterFn($));
  $.sensitiveFieldAttribute = $.RULE(
    "sensitiveFieldAttribute",
    sensitiveFieldAttribute($),
  );
  $.valueFieldAttribute = $.RULE("valueFieldAttribute", valueFieldAttribute($));
  $.valuesFieldAttribute = $.RULE(
    "valuesFieldAttribute",
    valuesFieldAttribute($),
  );
  $.visibilityFieldAttribute = $.RULE(
    "visibilityFieldAttribute",
    visibilityFieldAttribute($),
  );
};
