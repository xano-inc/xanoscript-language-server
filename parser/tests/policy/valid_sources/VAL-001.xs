policy VAL-001 {
  title = "Inputs and privileged writes are explicit"
  statement = "Inputs have declared types and filters; privileged write fields are not copied directly from request input."

  severity = "high"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Inputs have declared types and filters; privileged write fields are not copied directly from request input.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Protected write fields do not come from input"
    check = "db.write_from_input_forbidden"
    params = { statements: ["db.add"], fields: ["employee_id", "role"] }
  }

  rule {
    title = "Inputs declare suitable types and bounds"
    check = "object.input_rules"
    params = { except_tags: ["xano:quick-start"], type_by_name: { email: "email" }, filters_required: ["trim"], paging_max_required: true, path_params_forbidden: ["email", "ssn"] }
  }

  rule {
    title = "Declared inputs are read"
    check = "object.unused_input_forbidden"
    params = { except_tags: ["xano:quick-start"], object_kinds: ["query", "tool", "message"] }
  }
}
