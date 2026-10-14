import { MicroserviceToken } from "../lexer/api.js";
import { ImageToken } from "../lexer/columns.js";
import { EqualToken, LCurly, RCurly } from "../lexer/control.js";
import { StringLiteral } from "../lexer/literal.js";
import {
  ArgToken,
  ChartToken,
  CommandToken,
  ConfigToken,
  ContainerToken,
  DeploymentToken,
  DockerToken,
  EnvToken,
  IngressToken,
  KindToken,
  PortsToken,
  PullSecretToken,
  ReplicasToken,
  ResourcesToken,
  StrategyToken,
  TenantDeployToken,
  VolumeToken,
} from "../lexer/microservice.js";
import { Identifier, NewlineToken, TypeToken } from "../lexer/tokens.js";

// Grammar for the top-level `microservice <name> { ... }` entity.
//
// Grounded against the Xano backend's XanoScript schema:
//
//   microservice <name> {
//     description|guid|kind|tenant_deploy = "..."   # static:text (optional)
//     config <name> { type? value? }                # REPEATING
//     volume <name> { size? class? }                # REPEATING
//     ingress <name> { domain? path? }              # REPEATING
//     chart { ref? version? values? }               # single
//     deployment {                                  # single
//       replicas? = 1  docker? = "..."  strategy? = "..."
//       container <name> {                          # REPEATING
//         image? pull_secret? type? = "..."
//         command? arg? env? = [ {...} ]  ports? = [ {...} ]  resources? = {...}
//         volume <name> { type? persistent? emptyDir? config? }  # REPEATING
//       }
//     }
//   }
//
// Blocks that mix leaf attributes with nested/repeating sub-blocks
// (microservice, deployment, container) use explicit gated OR-loops — mirroring
// channel_parser.js / mcp_server_parser.js. Leaf-only blocks
// (config/volume/ingress/chart/container_volume) delegate their `key = value`
// body to schemaParseAttributeFn, which validates the key set for free.

export function microserviceDeclaration($) {
  return () => {
    let hasDescription = false;
    let hasGuid = false;
    let hasKind = false;
    let hasTenantDeploy = false;
    let hasDeployment = false;
    let hasChart = false;

    $.sectionStack.push("microserviceDeclaration");
    // Allow leading comments and newlines before the microservice declaration
    $.SUBRULE($.optionalCommentBlockFn);
    $.CONSUME(MicroserviceToken); // "microservice"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "microservice");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken)); // at least one new line
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasDescription,
          ALT: () => {
            hasDescription = true;
            $.SUBRULE($.descriptionFieldAttribute);
          },
        },
        {
          GATE: () => !hasGuid,
          ALT: () => {
            hasGuid = true;
            $.SUBRULE($.guidFieldAttribute);
          },
        },
        {
          GATE: () => !hasKind,
          ALT: () => {
            hasKind = true;
            const t = $.CONSUME(KindToken); // "kind"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasTenantDeploy,
          ALT: () => {
            hasTenantDeploy = true;
            const t = $.CONSUME(TenantDeployToken); // "tenant_deploy"
            $.CONSUME1(EqualToken); // "="
            $.SUBRULE1($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasDeployment,
          ALT: () => {
            hasDeployment = true;
            $.SUBRULE($.microserviceDeploymentClause);
          },
        },
        {
          GATE: () => !hasChart,
          ALT: () => {
            hasChart = true;
            $.SUBRULE($.microserviceChartClause);
          },
        },
        // config / volume / ingress are repeating — no single-shot gate.
        {
          ALT: () => $.SUBRULE($.microserviceConfigClause),
        },
        {
          ALT: () => $.SUBRULE($.microserviceVolumeClause),
        },
        {
          ALT: () => $.SUBRULE($.microserviceIngressClause),
        },
      ]);
    });

    // All fields are optional — only the declaration name is required.

    $.MANY1(() => $.CONSUME1(NewlineToken)); // optional new line
    $.CONSUME(RCurly); // "}"
    $.MANY2(() => $.CONSUME2(NewlineToken)); // optional new line
    $.sectionStack.pop();
  };
}

// deployment { replicas? docker? strategy?  container <name> { ... } }
export function microserviceDeploymentClause($) {
  return () => {
    let hasReplicas = false;
    let hasDocker = false;
    let hasStrategy = false;

    $.CONSUME(DeploymentToken); // "deployment"
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken));
      $.OR([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasReplicas,
          ALT: () => {
            hasReplicas = true;
            const t = $.CONSUME(ReplicasToken); // "replicas"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.schemaFn, { ARGS: [t, "[number]"] });
          },
        },
        {
          GATE: () => !hasDocker,
          ALT: () => {
            hasDocker = true;
            const t = $.CONSUME(DockerToken); // "docker"
            $.CONSUME1(EqualToken); // "="
            $.SUBRULE1($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasStrategy,
          ALT: () => {
            hasStrategy = true;
            const t = $.CONSUME(StrategyToken); // "strategy"
            $.CONSUME2(EqualToken); // "="
            $.SUBRULE2($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        // container is repeating — no single-shot gate.
        {
          ALT: () => $.SUBRULE($.microserviceContainerClause),
        },
      ]);
    });

    $.MANY1(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RCurly); // "}"
  };
}

// container <name> { image? pull_secret? type? command? arg? env? ports? resources?  volume <name> { ... } }
export function microserviceContainerClause($) {
  return () => {
    let hasImage = false;
    let hasPullSecret = false;
    let hasType = false;
    let hasCommand = false;
    let hasArg = false;
    let hasEnv = false;
    let hasPorts = false;
    let hasResources = false;

    $.CONSUME(ContainerToken); // "container"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "container");
    $.CONSUME(LCurly); // "{"
    $.MANY(() => {
      $.AT_LEAST_ONE(() => $.CONSUME(NewlineToken));
      $.OR2([
        {
          ALT: () => $.SUBRULE($.commentBlockFn),
        },
        {
          GATE: () => !hasImage,
          ALT: () => {
            hasImage = true;
            const t = $.CONSUME(ImageToken); // "image"
            $.CONSUME(EqualToken); // "="
            $.SUBRULE($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasPullSecret,
          ALT: () => {
            hasPullSecret = true;
            const t = $.CONSUME(PullSecretToken); // "pull_secret"
            $.CONSUME1(EqualToken); // "="
            $.SUBRULE1($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasType,
          ALT: () => {
            hasType = true;
            const t = $.CONSUME(TypeToken); // "type"
            $.CONSUME2(EqualToken); // "="
            $.SUBRULE2($.schemaFn, { ARGS: [t, "[string]"] });
          },
        },
        {
          GATE: () => !hasCommand,
          ALT: () => {
            hasCommand = true;
            const t = $.CONSUME(CommandToken); // "command"
            $.CONSUME3(EqualToken); // "="
            // !static:objects { name } -> [ { name: "..." } ]
            $.SUBRULE3($.schemaFn, { ARGS: [t, [{ name: "[string]" }]] });
          },
        },
        {
          GATE: () => !hasArg,
          ALT: () => {
            hasArg = true;
            const t = $.CONSUME(ArgToken); // "arg"
            $.CONSUME4(EqualToken); // "="
            // !static:objects { name } -> [ { name: "..." } ]
            $.SUBRULE4($.schemaFn, { ARGS: [t, [{ name: "[string]" }]] });
          },
        },
        {
          GATE: () => !hasEnv,
          ALT: () => {
            hasEnv = true;
            const t = $.CONSUME(EnvToken); // "env"
            $.CONSUME5(EqualToken); // "="
            // !static:objects { name, value?, from_env? }
            //   -> [ { name: "...", value: "..." },
            //        { name: "...", from_env: "WORKSPACE_VAR" } ]
            //
            // `value` is a literal; `from_env` names a WORKSPACE environment
            // variable resolved at DEPLOY time (so the secret never enters the
            // document). The two are mutually exclusive — the server rejects an
            // entry carrying both — but that is a semantic rule, not a shape
            // one, so the grammar accepts either key and leaves the diagnostic
            // to the backend transform.
            $.SUBRULE5($.schemaFn, {
              ARGS: [
                t,
                [{ name: "[string]", "value?": "[string]", "from_env?": "[string]" }],
              ],
            });
          },
        },
        {
          GATE: () => !hasPorts,
          ALT: () => {
            hasPorts = true;
            const t = $.CONSUME(PortsToken); // "ports"
            $.CONSUME6(EqualToken); // "="
            // static:object[] -> [ { ...any } ]
            $.SUBRULE6($.schemaFn, { ARGS: [t, [{ "[string]?": "[constant]" }]] });
          },
        },
        {
          GATE: () => !hasResources,
          ALT: () => {
            hasResources = true;
            const t = $.CONSUME(ResourcesToken); // "resources"
            $.CONSUME7(EqualToken); // "="
            // static:object -> { ...any }
            $.SUBRULE7($.schemaFn, { ARGS: [t, { "[string]?": "[constant]" }] });
          },
        },
        // volume is repeating — no single-shot gate.
        {
          ALT: () => $.SUBRULE($.microserviceContainerVolumeClause),
        },
      ]);
    });

    $.MANY1(() => $.CONSUME1(NewlineToken));
    $.CONSUME(RCurly); // "}"
  };
}

// container-level volume <name> { type? persistent? emptyDir? config? }
export function microserviceContainerVolumeClause($) {
  return () => {
    const parent = $.CONSUME(VolumeToken); // "volume"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "volume");
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "type?": "[string]",
          "persistent?": { "[string]?": "[constant]" },
          "emptyDir?": { "[string]?": "[constant]" },
          "config?": { "[string]?": "[constant]" },
        },
      ],
    });
  };
}

// microservice-level config <name> { type? value? }
export function microserviceConfigClause($) {
  return () => {
    const parent = $.CONSUME(ConfigToken); // "config"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "config");
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [parent, { "type?": "[string]", "value?": "[string]" }],
    });
  };
}

// microservice-level volume <name> { size? class? }
export function microserviceVolumeClause($) {
  return () => {
    const parent = $.CONSUME(VolumeToken); // "volume"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "volume");
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [parent, { "size?": "[string]", "class?": "[string]" }],
    });
  };
}

// ingress <name> { domain? path? = [ { service? path? } ] }
export function microserviceIngressClause($) {
  return () => {
    const parent = $.CONSUME(IngressToken); // "ingress"
    const nameToken = $.OR([
      { ALT: () => $.CONSUME(StringLiteral) },
      { ALT: () => $.CONSUME(Identifier) },
    ]);
    $.validateDeclarationName(nameToken, "ingress");
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        {
          "domain?": "[string]",
          "path?": [{ "service?": "[string]", "path?": "[string]" }],
        },
      ],
    });
  };
}

// chart { ref? version? values? }
export function microserviceChartClause($) {
  return () => {
    const parent = $.CONSUME(ChartToken); // "chart"
    $.SUBRULE($.schemaParseAttributeFn, {
      ARGS: [
        parent,
        { "ref?": "[string]", "version?": "[string]", "values?": "[string]" },
      ],
    });
  };
}
