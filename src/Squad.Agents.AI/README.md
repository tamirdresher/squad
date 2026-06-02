# Squad.Agents.AI

> **Preview package.** `Squad.Agents.AI` is a `0.1.0-preview` NuGet package for early adopters. It targets `net10.0` and depends on preview Microsoft Agent Framework / GitHub Copilot SDK packages, so APIs may change before a stable release.

## What it does

`Squad.Agents.AI` exposes a Squad team as a Microsoft Agent Framework `AIAgent`. It builds a GitHub Copilot SDK client with Squad-specific options, delegates MAF sessions/runs/streaming to the inner Copilot agent, and gives .NET consumers a DI-friendly wrapper instead of hand-rolling CLI process setup.

Public surface in this preview:

- `SquadAgent` — sealed `AIAgent` wrapper over the Copilot-backed inner agent.
- `SquadAgentOptions` — team root, CLI path/args, environment, token, logging, and instruction settings.
- `SquadConnectionFactory` — parses PATH or `squad://` connection strings into options.
- `SquadServiceCollectionExtensions` — registers `SquadAgent` and base `AIAgent` in DI.

Repository: <https://github.com/tamirdresher/squad>

## Install

```bash
dotnet add package Squad.Agents.AI --prerelease
```

If you are consuming the PR before publish, pack it locally and add the generated package source:

```bash
dotnet pack src/Squad.Agents.AI/Squad.Agents.AI.csproj -c Release -o nupkgs
dotnet add package Squad.Agents.AI --prerelease --source ./nupkgs
```

## Prerequisites

- .NET 10 SDK.
- GitHub Copilot CLI available on `PATH` (`copilot --version`).
- Squad CLI and an initialized team root containing `.squad/`; see the [Squad CLI repo](https://github.com/tamirdresher/squad).
- GitHub Copilot authentication. Prefer `GitHubTokenProvider`; if passing a token directly, use a Copilot-supported token format (`github_pat_`, `gho_`, or `ghu_`) and never hardcode it.

## Five-line quickstart

```csharp
using Microsoft.Agents.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Squad.Agents.AI;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSquadAgent(o =>
{
    o.SquadFolderPath = @"C:\path\to\team-root";
    o.GitHubTokenProvider = _ => ValueTask.FromResult(Environment.GetEnvironmentVariable("GH_TOKEN"));
});

using var host = builder.Build();
var squad = host.Services.GetRequiredService<AIAgent>();
var session = await squad.CreateSessionAsync();
var response = await squad.RunAsync("What can this Squad team do?", session);
Console.WriteLine(response.Text);
```

## Aspire / configuration path

`AddSquadAgent()` also reads `ConnectionStrings:squad` through `IConfiguration.GetConnectionString("squad")`. In environment variables, use `ConnectionStrings__squad`.

Supported connection string forms:

```text
C:\path\to\team-root
squad://localhost?teamRoot=C%3A%5Cteam&cliPath=C%3A%5Ctools%5Ccopilot.exe&cliArgs=--yolo&env=KEY=value
```

Parsed URI query keys: `teamRoot`, `cliPath`, `cwd`, `cliArgs` (semicolon-separated), and `env` (`key=value;key2=value2`). Unknown URI host/protocol values are reserved for future use.

## Key options

| Option | Purpose |
|---|---|
| `SquadFolderPath` | Squad team root; PATH connection strings set this and `Cwd`. |
| `CliPath` / `CliArgs` | Override the Copilot CLI executable and add extra CLI flags. |
| `Cwd` | Working directory for the Copilot CLI process; defaults to `SquadFolderPath`. |
| `Environment` | Additional environment variables for the CLI process. Avoid user-controlled values. |
| `GitHubToken` | Direct token for local/dev use; redacted by `ToString()`. |
| `GitHubTokenProvider` | Preferred callback for secure token retrieval; wins over `GitHubToken`. |
| `TraceEvents` | Enables verbose SDK logging and emits a startup warning when enabled. |
| `AgentName` | Display name for the resulting `AIAgent`; defaults to `Squad`. |
| `Instructions` | Optional system instructions passed to the inner Copilot agent. |

## Notes for v0.1-preview

- Default DI lifetime is scoped. An overload accepts any `ServiceLifetime`.
- DI registers both `SquadAgent` and base `AIAgent`.
- No keyed DI, multi-targeting, BYOK/session-provider pass-through, or richer native event streaming yet; these are v0.2 candidates.
- The package does not validate that `SquadFolderPath` exists or contains `.squad/`; consumers should validate their deployment paths.
- `TraceEvents` can log sensitive operational details. Keep it off unless debugging.

## Package contents

- `lib/net10.0/Squad.Agents.AI.dll`
- `lib/net10.0/Squad.Agents.AI.xml` for IntelliSense / API docs
- `README.md` for NuGet.org rendering
- `.nuspec` metadata with authors, tags, repository, and readme pointer
- `LICENSE` copied from the repository root

## See also

- Root repo: <https://github.com/tamirdresher/squad>
- Microsoft Agent Framework: <https://github.com/microsoft/agents>
- GitHub Copilot CLI: <https://github.com/github/copilot-cli>
- Changelog: <https://github.com/tamirdresher/squad/blob/feature/squad-agents-ai/CHANGELOG.md>

License: MIT.
