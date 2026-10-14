policy SEC-001 {
  title = "Unsafe statements and credentials stay out of definitions"
  statement = "Avoid destructive statements, insecure literal settings, unbounded tokens, and credential literals."

  severity = "critical"
  active = true
  enforcement = "advisory"

  narrative = """
  ## How this is implemented

  Avoid destructive statements, insecure literal settings, unbounded tokens, and credential literals.
  Review findings against the intended scope before making this policy blocking.
  These checks inspect definitions only; runtime behavior and compliance verification are out of scope.
  """

  rule {
    title = "No truncation or raw SQL"
    check = "stack.statement_forbidden"
    params = { statements: ["db.truncate", "db.direct_query", "db.external.*"] }
  }

  rule {
    title = "Requests verify TLS certificates and hosts"
    check = "statement.param_forbidden"
    params = { statements: ["api.request", "stream.from_request"], param_names: ["verify_peer", "verify_host"], values: [false] }
  }

  rule {
    title = "Tokens expire within one hour"
    check = "statement.param_bound"
    params = { statements: ["security.create_auth_token"], param_names: ["expiration"], min: 1, max: 3600, unit: "seconds" }
  }

  rule {
    title = "External requests time out within 30 seconds"
    check = "statement.param_bound"
    params = { statements: ["api.request", "stream.from_request", "webflow.request"], param_names: ["timeout"], max: 30, unit: "seconds" }
  }

  rule {
    title = "No recognisable credential literals"
    check = "literal.credential_shape"
  }

  rule {
    title = "Signed tokens expire within one hour"
    check = "statement.param_bound"
    params = { statements: ["security.jws_encode", "security.jwe_encode", "security.jwe_encode_legacy", "mvp:crypto_jws_encode", "mvp:crypto_jwe_encode2"], param_names: ["ttl"], min: 1, max: 3600, unit: "seconds" }
  }
}
