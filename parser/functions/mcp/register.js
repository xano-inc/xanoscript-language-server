import { mcpElicitFn } from "./mcpElicitFn.js";
import {
  mcpOauthCompleteFn,
  mcpOauthFn,
  mcpOauthRequestFn,
  mcpOauthRevokeFn,
} from "./mcpOauthFn.js";
import { mcpProgressFn } from "./mcpProgressFn.js";

/**
 * Registers all the parsers in this folder
 * @param {import('../../base_parser.js').XanoBaseParser} $
 */
export const register = ($) => {
  $.mcpElicitFn = $.RULE("mcpElicitFn", mcpElicitFn($));
  $.mcpProgressFn = $.RULE("mcpProgressFn", mcpProgressFn($));
  $.mcpOauthCompleteFn = $.RULE("mcpOauthCompleteFn", mcpOauthCompleteFn($));
  $.mcpOauthRequestFn = $.RULE("mcpOauthRequestFn", mcpOauthRequestFn($));
  $.mcpOauthRevokeFn = $.RULE("mcpOauthRevokeFn", mcpOauthRevokeFn($));
  $.mcpOauthFn = $.RULE("mcpOauthFn", mcpOauthFn($));
};
