policy CONF-001 {
  title = "Confidential data is labelled and access is audited"
  statement = "Confidential device data is labelled, hidden in saved views, and reached only through authenticated, audited endpoints."

  severity = "critical"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Confidential device data is labelled, hidden in saved views, and reached only through authenticated, audited endpoints.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Device notes are labelled"
    check = "table.tag_required"
    params = { except_tags: ["xano:quick-start"], field_names: ["notes"], tag: "confidential" }
  }

  rule {
    title = "Confidential access declares identity and audit"
    check = "object.tagged_table_access"
    params = { except_tags: ["xano:quick-start"], table_tags: ["confidential"], auth_tables: ["employee"], function: "access_audit" }
  }

  rule {
    title = "Confidential text is sensitive"
    check = "table.field_attribute_required"
    params = { tags: ["confidential"], field_names: ["codename", "serial"], attribute: "sensitive", must_exist: true }
  }

  rule {
    title = "Saved views hide sensitive fields"
    check = "table.view_hide_required"
    params = { tags: ["confidential"] }
  }
}
