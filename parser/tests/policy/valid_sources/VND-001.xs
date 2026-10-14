policy VND-001 {
  title = "Workspace data goes only to approved vendors"
  statement = "Review outbound hosts, storage and email providers, and agent models. Empty lists discover vendors as not yet reviewed without blocking. After review, add approved hosts and providers to the lists in this policy."

  severity = "high"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Review outbound hosts, storage and email providers, and agent models. Empty lists discover vendors as not yet reviewed without blocking.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "Discover outbound hosts and service providers"
    check = "outbound.vendor_allowlist"
    params = { kinds: ["http", "cloud", "email"] }
  }

  rule {
    title = "Discover agent model providers"
    check = "outbound.vendor_allowlist"
    params = { kinds: ["agent.llm"] }
  }

  rule {
    title = "Discover vendors on PHI paths"
    check = "outbound.vendor_allowlist"
    params = { reaching_table_tags: ["phi"] }
  }
}
