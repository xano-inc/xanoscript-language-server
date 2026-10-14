policy AUTH-002 {
  title = "Identity and entry checks follow workspace conventions"
  statement = "The workspace uses one auth table, and protected entry points declare required checks and middleware."

  severity = "critical"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  The workspace uses one auth table, and protected entry points declare required checks and middleware.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Exactly one auth table"
    check = "table.auth_table_rules"
  }

  rule {
    title = "Write endpoints require authentication"
    check = "object.auth_required"
    params = { verbs: ["POST", "PUT", "PATCH", "DELETE"], except_tags: ["public", "xano:quick-start"], object_kinds: ["query"] }
  }

  rule {
    title = "Administrative endpoints declare a role check"
    check = "object.statement_required"
    params = { tags: ["admin"], functions: ["require_admin"], placement: "first", must_reference: ["$auth"], object_kinds: ["query"] }
  }

  rule {
    title = "Protected endpoints attach middleware"
    check = "object.middleware_required"
    params = { middleware: ["access_context"], endpoint_auth: "required", except_tags: ["xano:quick-start"], object_kinds: ["query"] }
  }
}
