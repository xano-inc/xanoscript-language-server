policy RET-001 {
  title = "Retention and audit operations have explicit owners"
  statement = "Audit writes belong to one function, retained tables have a task that deletes from them, and trigger writes account for the triggers they skip or re-fire."

  severity = "high"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Audit writes belong to one function, retained tables have a task that deletes from them, and trigger writes account for the triggers they skip or re-fire.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Only the audit function writes the access log"
    check = "table.write_location_restricted"
    params = { restricted_tables: ["access_log"], allowed_functions: ["access_audit"], allowed_tags: ["approved-retention"] }
  }

  rule {
    title = "Confidential tables have a retention task"
    check = "table.coverage_required"
    params = { tags: ["confidential"], referenced_by: { object_kinds: ["task"], tags: ["retention"], statements: ["db.del", "db.bulk.delete", "db.truncate", "db.direct_query"] } }
  }

  rule {
    title = "Trigger writes do not silently skip other triggers or re-fire themselves"
    check = "trigger.write_trigger_effects"
  }

  rule {
    title = "An audit table exists"
    check = "workspace.object_required"
    params = { object_kind: "table", names: ["access_log"] }
  }
}
