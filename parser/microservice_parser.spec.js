import { expect } from "chai";
import { describe, it } from "mocha";
import { xanoscriptParser } from "./parser.js";

describe("microservice", () => {
  // ── Real saved microservice examples (backend fixtures) ──
  // These are the authoritative surface forms the LSP must parse cleanly; before
  // this grammar existed every one of them produced a false-positive diagnostic.

  it("should parse a minimal container microservice with a description", () => {
    const parser = xanoscriptParser(`microservice echo {
  description = "echo service"

  deployment {
    container model {
      image = "ghcr.io/acme/triton:24.03"
      pull_secret = "xano-registry-readonly"
      ports = [{containerPort: "8000", servicePort: "8000"}]
      resources = {cpu: "2", ram: "8Gi"}
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a deployment with replicas and strategy (leading comment)", () => {
    const parser = xanoscriptParser(`// echo service
microservice echo {
  deployment {
    replicas = 1
    strategy = "Recreate"

    container echo {
      image = "hashicorp/http-echo"
      ports = [{containerPort: "5678", servicePort: "5678"}]
      resources = {cpu: "50m", ram: "256Mi"}
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse the captured tenant_deploy=manual example (AC: minimal)", () => {
    const parser = xanoscriptParser(`microservice batchworker {
  tenant_deploy = "manual"

  deployment {
    container batchworker {
      image = "hashicorp/http-echo"
      ports = [{containerPort: 8080, servicePort: 80}]
      resources = {cpu: "50m", ram: "256Mi"}
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a helm microservice with a chart block", () => {
    const parser = xanoscriptParser(`microservice helmnginx {
  kind = "helm"

  chart {
    ref = "oci://registry.example.com/charts/nginx"
    version = "1.4.0"
    values = "replicaCount: 2"
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a microservice mixing a deployment and a chart", () => {
    const parser = xanoscriptParser(`microservice echomix {
  kind = "helm"

  deployment {
    container echomix {
      image = "ealen/echo-server:latest"
      resources = {cpu: "50m", ram: "256Mi"}
    }
  }

  chart {
    ref = "https://ealenn.github.io/charts echo-server"
    version = "0.5.0"
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  // ── Names ──

  it("should parse a microservice with an identifier name", () => {
    const parser = xanoscriptParser(`microservice my_service {
  tenant_deploy = "manual"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a microservice with a string literal name", () => {
    const parser = xanoscriptParser(`microservice "My Service" {
  tenant_deploy = "manual"
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a microservice with an empty body", () => {
    const parser = xanoscriptParser(`microservice bare {}`);

    expect(parser.errors).to.be.empty;
  });

  // ── Top-level scalar attributes ──

  it("should parse all top-level scalar attributes", () => {
    const parser = xanoscriptParser(`microservice svc {
  description = "a service"
  guid = "tgGYuUFKbBz4"
  kind = "container"
  tenant_deploy = "auto"
}`);

    expect(parser.errors).to.be.empty;
  });

  // ── Repeating blocks: config / volume / ingress ──

  it("should parse a single config block", () => {
    const parser = xanoscriptParser(`microservice svc {
  config db_url {
    type = "text"
    value = "postgres://localhost"
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse multiple (repeating) config blocks", () => {
    const parser = xanoscriptParser(`microservice svc {
  config db_url {
    value = "postgres://localhost"
  }
  config api_key {
    type = "secret"
    value = "xyz"
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse multiple (repeating) volume blocks", () => {
    const parser = xanoscriptParser(`microservice svc {
  volume data {
    size = "10Gi"
    class = "ssd"
  }
  volume cache {
    size = "1Gi"
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse an ingress block with a path array", () => {
    const parser = xanoscriptParser(`microservice svc {
  ingress web {
    domain = "example.com"
    path = [{service: "echo", path: "/"}, {service: "api", path: "/api"}]
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  // ── Deployment / container leaf attributes ──

  it("should parse a container with command, arg and env object lists", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      image = "app:latest"
      command = [{name: "sh"}]
      arg = [{name: "-c"}, {name: "run"}]
      env = [{name: "FOO", value: "bar"}, {name: "BARE"}]
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a container env entry that references a workspace variable", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      image = "app:latest"
      env = [{name: "LOG_LEVEL", value: "debug"}, {name: "API_KEY", from_env: "STRIPE_SECRET"}]
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a container with a type and multiple ports", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      image = "app:latest"
      type = "worker"
      ports = [{containerPort: 80, servicePort: 8080}, {containerPort: 443, servicePort: 8443}]
      resources = {cpu: "1", ram: "512Mi"}
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse container-level volume blocks", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      image = "app:latest"
      volume vol1 {
        type = "pvc"
        persistent = {size: "5Gi"}
      }
      volume vol2 {
        emptyDir = {}
        config = {name: "cfg"}
      }
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a deployment with multiple containers", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container web {
      image = "nginx"
    }
    container worker {
      image = "worker:1"
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  // ── AC: a full document exercising every block at once ──

  it("should parse a full microservice with every block (AC: full doc)", () => {
    const parser = xanoscriptParser(`microservice full {
  description = "full example"
  guid = "abc123"
  kind = "container"
  tenant_deploy = "manual"

  config db_url {
    type = "text"
    value = "postgres://x"
  }

  volume data {
    size = "10Gi"
    class = "ssd"
  }

  ingress web {
    domain = "example.com"
    path = [{service: "echo", path: "/"}]
  }

  chart {
    ref = "oci://r/c"
    version = "1.0.0"
    values = "x: 1"
  }

  deployment {
    replicas = 3
    docker = "compose"
    strategy = "RollingUpdate"

    container web {
      image = "nginx:latest"
      pull_secret = "reg"
      type = "worker"
      command = [{name: "sh"}]
      arg = [{name: "-c"}]
      env = [{name: "FOO", value: "bar"}]
      ports = [{containerPort: 80, servicePort: 8080}]
      resources = {cpu: "1", ram: "512Mi"}

      volume vol1 {
        type = "pvc"
        persistent = {size: "5Gi"}
      }
    }
  }
}`);

    expect(parser.errors).to.be.empty;
  });

  it("should parse a microservice with a trailing comment in the body", () => {
    const parser = xanoscriptParser(`microservice svc {
  tenant_deploy = "manual"
  // deployment handled elsewhere
}`);

    expect(parser.errors).to.be.empty;
  });

  // ── Malformed documents must still error (the fix adds grammar, it does not
  //    blanket-suppress diagnostics) ──

  it("should error on an unknown top-level attribute (AC: malformed)", () => {
    const parser = xanoscriptParser(`microservice svc {
  tenant_deployX = "manual"
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on an unknown container attribute", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      imageX = "app:latest"
    }
  }
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on an unknown key inside a config block", () => {
    const parser = xanoscriptParser(`microservice svc {
  config c {
    typeX = "text"
  }
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error when replicas is not a number", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    replicas = "three"
  }
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on an empty microservice name", () => {
    const parser = xanoscriptParser(`microservice "" {
  tenant_deploy = "manual"
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on a duplicate single-shot attribute", () => {
    const parser = xanoscriptParser(`microservice svc {
  tenant_deploy = "manual"
  tenant_deploy = "auto"
}`);

    expect(parser.errors).to.not.be.empty;
  });

  it("should error on an unterminated block", () => {
    const parser = xanoscriptParser(`microservice svc {
  deployment {
    container app {
      image = "app:latest"
`);

    expect(parser.errors).to.not.be.empty;
  });
});
