import { Identifier } from "./identifier.js";
import { createTokenByName } from "./utils.js";

// Tokens for the top-level `microservice <name> { ... }` entity.
//
// The `microservice` keyword itself is NOT defined here — it reuses
// `MicroserviceToken` from `lexer/api.js` (also used by the inline
// `api.microservice` statement). Defining a second token for the same keyword
// would create two token types matching "microservice" and break lexing.
//
// Common words (`config`, `env`, `command`, `arg`, `ports`, `resources`, ...)
// all carry `longer_alt: Identifier` + `categories: [Identifier]` so they still
// behave as ordinary identifiers everywhere else in the grammar.

// ── Block keywords (introduce nested `{ ... }` blocks) ──

// "deployment"
export const DeploymentToken = createTokenByName("deployment", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "container"
export const ContainerToken = createTokenByName("container", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "config"
export const ConfigToken = createTokenByName("config", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "volume"
export const VolumeToken = createTokenByName("volume", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "ingress"
export const IngressToken = createTokenByName("ingress", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "chart"
export const ChartToken = createTokenByName("chart", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// ── Leaf attribute keywords (`key = value`) ──

// "kind"
export const KindToken = createTokenByName("kind", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "tenant_deploy"
export const TenantDeployToken = createTokenByName("tenant_deploy", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "replicas"
export const ReplicasToken = createTokenByName("replicas", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "docker"
export const DockerToken = createTokenByName("docker", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "strategy"
export const StrategyToken = createTokenByName("strategy", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "pull_secret"
export const PullSecretToken = createTokenByName("pull_secret", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "command"
export const CommandToken = createTokenByName("command", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "arg"
export const ArgToken = createTokenByName("arg", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "env"
export const EnvToken = createTokenByName("env", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "ports"
export const PortsToken = createTokenByName("ports", {
  longer_alt: Identifier,
  categories: [Identifier],
});

// "resources"
export const ResourcesToken = createTokenByName("resources", {
  longer_alt: Identifier,
  categories: [Identifier],
});

export const MicroserviceTokens = [
  DeploymentToken,
  ContainerToken,
  ConfigToken,
  VolumeToken,
  IngressToken,
  ChartToken,
  KindToken,
  TenantDeployToken,
  ReplicasToken,
  DockerToken,
  StrategyToken,
  PullSecretToken,
  CommandToken,
  ArgToken,
  EnvToken,
  PortsToken,
  ResourcesToken,
];

/**
 * Maps a token name to a semantic type
 * @param {string} token the token name
 */
export function mapTokenToType(token) {
  switch (token) {
    case DeploymentToken.name:
    case ContainerToken.name:
    case ConfigToken.name:
    case VolumeToken.name:
    case IngressToken.name:
    case ChartToken.name:
      return "keyword";
    case KindToken.name:
    case TenantDeployToken.name:
    case ReplicasToken.name:
    case DockerToken.name:
    case StrategyToken.name:
    case PullSecretToken.name:
    case CommandToken.name:
    case ArgToken.name:
    case EnvToken.name:
    case PortsToken.name:
    case ResourcesToken.name:
      return "variable";
    default:
      return null;
  }
}
