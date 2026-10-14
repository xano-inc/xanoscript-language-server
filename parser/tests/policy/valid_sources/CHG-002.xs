policy CHG-002 {
  title = "Endpoints declare useful workflow-test coverage"
  statement = "Workflow tests reference protected endpoints and contain an anonymous rejection assertion. The checks inspect test definitions statically, without executing them."

  severity = "low"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Workflow tests reference protected endpoints and contain an anonymous rejection assertion. The checks inspect test definitions statically, without executing them.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Protected endpoints are covered"
    check = "object.test_coverage"
    params = { endpoint_auth: "required", except_tags: ["xano:quick-start"], object_kinds: ["query"] }
  }

  rule {
    title = "Anonymous calls declare a rejection assertion"
    check = "test.assertion_required"
    params = { except_tags: ["xano:quick-start"] }
  }
}
