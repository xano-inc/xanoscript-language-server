policy LOG-001 {
  title = "Logs and error handling minimize accidental exposure"
  statement = "Debug and Datadog logs exclude direct sensitive references; outbound requests, external MCP calls and external database queries have error handling; and silent error settings are visible."

  severity = "high"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Debug and Datadog logs exclude direct sensitive references; outbound requests, external MCP calls and external database queries have error handling; and silent error settings are visible.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Logs avoid direct input and auth objects"
    check = "statement.expression_rule"
    params = { statements: ["debug.log", "datadog.log", "datadog.log_bulk"], param_names: ["value", "message", "attributes", "entries"], must_not_reference: ["$input", "$auth", "$env"], operators_forbidden: ["~"] }
  }

  rule {
    title = "External calls have error handling"
    check = "statement.containment"
    params = { statements: ["api.request", "stream.from_request", "ai.external.mcp.server_details", "ai.external.mcp.tool.list", "ai.external.mcp.tool.run", "db.external.postgres.direct_query", "db.external.mysql.direct_query", "db.external.mssql.direct_query", "db.external.oracle.direct_query", "db.external.snowflake.direct_query"], must_be_inside: ["try_catch"] }
  }

  rule {
    title = "Middleware does not silently ignore exceptions"
    check = "object.settings_forbidden"
    params = { object_kind: "middleware", when: { exception_policy: { equals: "silent" } } }
  }
}
