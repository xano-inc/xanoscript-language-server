# Contributing

Thanks for helping improve the XanoScript Language Server. Bug reports and pull requests are welcome.

## Reporting a bug

Open an issue with:

- the smallest `.xs` snippet that shows the problem
- what the server reported (diagnostic, completion or hover) and what you expected
- the package version (`npm ls @xano/xanoscript-language-server`)

For a security issue, follow [SECURITY.md](SECURITY.md) instead.

## Setup

```sh
npm install
npm run lint
npm test
```

Node.js 20 or later is required. There is no build step: the code is plain JavaScript ES modules.

## How the code is organized

The pipeline is **lexer → parser → language server features**. Statements are layered:

1. **Parser** - one per object type (`parser/query_parser.js`, `parser/function_parser.js`, ...)
2. **Clause** - the main blocks of an object (`stack`, `input`, `response`, ...)
3. **Function** - statements such as `debug.log` or `db.query`
4. **Attributes / definitions** - the parts a function is built from
5. **Generic** - the shared parsing toolset

[CLAUDE.md](CLAUDE.md) has the detailed walkthrough, written for people and coding agents alike.

### Adding a statement

1. Add the token in the right `lexer/` file
2. Implement it in `parser/functions/<domain>/`
3. Register it in its parent clause or dispatcher
4. Add tests in a matching `.spec.js` file

### Adding an object type

1. Add its tokens in `lexer/<type>.js` and register them in `lexer/tokens.js`
2. Write `parser/<type>_parser.js` and register the rule in `parser/register.js`
3. Map the first word to a scheme in `utils.js` (`schemeByFirstWord`)
4. Route the scheme in `parser/parser.js`
5. Add `parser/<type>_parser.spec.js`

## Tests

Tests use Mocha and Chai, live next to the code they cover, and use the `.spec.js` suffix. Real XanoScript samples live in `valid_sources/` folders. Keep tests:

- easy to copy, paste and extend
- explicit: no loops or generated test cases

## Pull requests

- Keep each pull request to one change, with tests
- `npm run lint` and `npm test` must pass (the pre-commit hook and CI both run them)
- Follow the conventions of the neighboring files

By contributing, you agree that your contribution is licensed under the [MIT License](LICENSE).
