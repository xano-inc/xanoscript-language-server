import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "../../parser.js";

// mcp.oauth.complete / request / revoke. They run
// in the customer's login endpoint, so the tests host them in a query.
const inQuery = (stack) =>
  xanoscriptParser(`query "mcp/login" verb=POST {
  input {
    text mcp_request
    text decision?
    text user_id?
    int grant_id?
  }

  stack {
${stack}
  }

  response = null
}`);

describe("mcp.oauth", () => {
  it("parses mcp.oauth.complete with request and decision", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
      decision = "deny"
    } as $continue_url`);
    expect(parser.errors).to.be.empty;
  });

  it("accepts an expression for decision", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
      decision = $input.decision
    } as $continue_url`);
    expect(parser.errors).to.be.empty;
  });

  it("requires decision on mcp.oauth.complete", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
    } as $continue_url`);
    expect(parser.errors).to.not.be.empty;
  });

  it("refuses an unknown literal decision", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
      decision = "maybe"
    } as $continue_url`);
    expect(parser.errors.map((e) => e.message)).to.include(
      'Invalid value "maybe". Must be one of: "approve", "deny"'
    );
  });

  it("parses mcp.oauth.complete with decision and unsafe_user_id", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
      decision = "approve"
      unsafe_user_id = $input.user_id
    } as $continue_url`);
    expect(parser.errors).to.be.empty;
  });

  it("requires request on mcp.oauth.complete", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      decision = "deny"
    } as $continue_url`);
    expect(parser.errors).to.not.be.empty;
  });

  it("refuses an unknown attribute on mcp.oauth.complete", () => {
    const parser = inQuery(`    mcp.oauth.complete {
      request = $input.mcp_request
      decision = "approve"
      user_id = $input.user_id
    } as $continue_url`);
    expect(parser.errors).to.not.be.empty;
  });

  it("parses mcp.oauth.request", () => {
    const parser = inQuery(`    mcp.oauth.request {
      request = $input.mcp_request
    } as $sign_in`);
    expect(parser.errors).to.be.empty;
  });

  it("requires request on mcp.oauth.request", () => {
    const parser = inQuery(`    mcp.oauth.request {
      description = "x"
    } as $sign_in`);
    expect(parser.errors).to.not.be.empty;
  });

  it("parses mcp.oauth.revoke by user_id", () => {
    const parser = inQuery(`    mcp.oauth.revoke {
      mcp_server = "example_server"
      user_id = $input.user_id
    } as $revoked`);
    expect(parser.errors).to.be.empty;
  });

  it("parses mcp.oauth.revoke by grant_id with all = false", () => {
    const parser = inQuery(`    mcp.oauth.revoke {
      mcp_server = "example_server"
      grant_id = $input.grant_id
      all = false
    } as $revoked`);
    expect(parser.errors).to.be.empty;
  });

  it("parses mcp.oauth.revoke for every grant", () => {
    const parser = inQuery(`    mcp.oauth.revoke {
      mcp_server = "example_server"
      all = true
    } as $revoked`);
    expect(parser.errors).to.be.empty;
  });

  it("requires mcp_server on mcp.oauth.revoke", () => {
    const parser = inQuery(`    mcp.oauth.revoke {
      all = true
    } as $revoked`);
    expect(parser.errors).to.not.be.empty;
  });

  it("still parses mcp.progress beside the oauth statements", () => {
    const parser = inQuery(`    mcp.progress {
      progress = 1
    }`);
    expect(parser.errors).to.be.empty;
  });
});
