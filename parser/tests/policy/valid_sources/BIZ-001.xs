policy BIZ-001 {
  title = "Critical writes and reads declare visible preconditions"
  statement = "A top-level precondition precedes writes, and checkout reads mention the owner constraint. These syntactic checks stay advisory."

  severity = "high"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  A top-level precondition precedes writes, and checkout reads mention the owner constraint. These syntactic checks stay advisory.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Precondition precedes a write"
    check = "stack.statement_order"
    params = { before: { statements: ["precondition"], must_reference: ["$auth"] }, after: ["db.add", "db.edit", "db.patch"] }
  }

  rule {
    title = "Checkout reads constrain the employee"
    check = "db.where_constraint_required"
    params = { table_selector: { has_field: "employee_id" }, field: "employee_id", compare_to: "$auth.id" }
  }
}
