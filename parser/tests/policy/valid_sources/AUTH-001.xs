policy AUTH-001 {
  title = "Every endpoint is authenticated unless it is deliberately public"
  statement = "A query either declares an auth table, or it or its API group carries the tag public. Why it is public belongs in its description; no rule checks that."
  rationale = "The lab backend serves unreleased product data. An endpoint that ships without an auth declaration is open to the internet by default, and nobody notices until it is found."

  severity = "critical"
  active = true
  enforcement = "blocking"

  tags = ["soc2"]

  narrative = """
  ## How this is implemented

  This policy supports SOC 2 criterion CC6.1 (logical access security).

  Every `query` this workspace owns declares `auth = "employee"` (or another auth
  table). The one
  deliberate exception is the load-balancer liveness probe `GET /health`, which returns no data and
  carries `tags = ["public"]` with a description saying so.

  **Detection.** Rule AUTH-001.R1 fails any query with no auth declaration, on every push. The rule
  names its one exception itself (`except_tags: ["public"]`): a query that carries the `public` tag,
  or sits in an API group that does, is left out. The rule is scoped by tag rather than by API group name, so renaming a group
  does not silently drop it: Xano's own bundled Quick Start objects are excluded because they carry
  `tags = ["xano:quick-start"]`, and every other endpoint is in scope by default.

  **Owner.** Dana Whitaker reviews the list of public endpoints each quarter; adding one is a
  deliberate act, recorded in the tag and in the description.
  """

  rule {
    title = "Endpoint declares auth, or is tagged public"
    check = "object.auth_required"
    params = { except_tags: ["public", "xano:quick-start"] }
  }
}
