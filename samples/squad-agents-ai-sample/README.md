# Squad.Agents.AI — Sample Application

This sample demonstrates the four core integration patterns in `Squad.Agents.AI` v0.1: basic dependency-injection registration, keyed DI with multiple agents, the BYOK `ConfigureCopilotClient` delegate, and streaming via `RunStreamingAsync`. Each flow runs independently so you can focus on exactly the pattern you care about. It mirrors the plain-console structure of Microsoft Agent Framework reference samples: one `HostApplicationBuilder`, services registered once, agents resolved from DI, prompts sent, responses printed.

## Prerequisites

| Prerequisite | Notes |
|---|---|
| [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | `dotnet --version` should print `10.x.x` |
| GitHub Copilot CLI on `PATH` | Install from [github.com/github/copilot-cli](https://github.com/github/copilot-cli); verify with `copilot --version` |
| Squad CLI installed | Follow the install guide in the [Squad repository README](https://github.com/tamirdresher/squad#readme) |
| Initialized Squad team root | Run `squad init` in a directory; this becomes your team root |
| GitHub Copilot authentication | Run `gh auth login` or the Copilot CLI sign-in flow (`copilot auth login`) once before running the sample |

The sample reads the team root path from the `SQUAD_TEAM_ROOT` environment variable, falling back to the current working directory. Set it before running:

```bash
# Linux / macOS
export SQUAD_TEAM_ROOT=/path/to/your/team-root

# Windows PowerShell
$env:SQUAD_TEAM_ROOT = "C:\path\to\your\team-root"
```

## Run

Run all four flows in sequence:

```bash
dotnet run --project samples/squad-agents-ai-sample/
```

Run a single flow (1–4):

```bash
dotnet run --project samples/squad-agents-ai-sample/ -- --flow=1
dotnet run --project samples/squad-agents-ai-sample/ -- --flow=2
dotnet run --project samples/squad-agents-ai-sample/ -- --flow=3
dotnet run --project samples/squad-agents-ai-sample/ -- --flow=4
```

## Code Walkthrough

### Flow 1 — Basic DI Registration

The simplest path. A single `AddSquadAgent` call registers `SquadAgent` and the base `AIAgent` interface in a scoped DI scope. The sample resolves `SquadAgent` directly from `IServiceProvider`, creates a session, and calls `RunAsync` with a string prompt. The `AgentResponse.Text` property contains the full text of the response. This is the pattern most consumers will start with — if it works, you are set up correctly.

```csharp
host.Services.AddSquadAgent(o =>
{
    o.SquadFolderPath = teamRoot;
    o.Instructions = "You are a helpful assistant. Respond concisely.";
});
var agent = host.Services.GetRequiredService<SquadAgent>();
var session = await agent.CreateSessionAsync();
var response = await agent.RunAsync("What is 2 + 2?", session);
Console.WriteLine(response.Text);
```

### Flow 2 — Keyed DI (Multiple Agents)

Uses `AddKeyedSquadAgent` to register two agents under distinct service keys (`"alpha"` and `"beta"`). Both coexist in the same container. Resolution uses `GetRequiredKeyedService<SquadAgent>("alpha")`. This pattern is useful for multi-tenant apps, A/B model comparisons, or routing logic that sends different query types to different agent configurations.

```csharp
services.AddKeyedSquadAgent("alpha", o => { o.Instructions = "Be concise."; });
services.AddKeyedSquadAgent("beta",  o => { o.Instructions = "Be detailed."; });

var alpha = provider.GetRequiredKeyedService<SquadAgent>("alpha");
var beta  = provider.GetRequiredKeyedService<SquadAgent>("beta");
```

### Flow 3 — BYOK / `ConfigureCopilotClient` Delegate

`SquadAgentOptions.ConfigureCopilotClient` is the extension point for advanced SDK customization. The delegate receives `CopilotClientOptions` after Squad has applied its standard values. You can inject a token from a credential store, add custom environment variables, or tune SDK settings. A hard routing gate prevents the delegate from accidentally redirecting the agent to a different CLI process — if you change `Cwd`, `CliPath`, or `CliArgs`, Squad logs a warning and restores the originals. Configure those properties on `SquadAgentOptions` directly instead.

```csharp
o.ConfigureCopilotClient = clientOpts =>
{
    clientOpts.GitHubToken = myVault.GetSecret("copilot-token");
    clientOpts.Environment["MY_VAR"] = "value";
};
```

In production, replace the simulated token with a real credential store integration (Key Vault, managed identity, `ICredentialProvider`, etc.). Never hardcode real tokens in source code.

### Flow 4 — Streaming

`RunStreamingAsync` returns `IAsyncEnumerable<AgentResponseUpdate>`. Each `update.Text` contains a response fragment as it arrives from the Copilot SDK, enabling live token-by-token output in console apps, chat UIs, or real-time APIs. The sample writes each fragment to `Console.Write` without a newline so the output reads as a continuous stream.

```csharp
await foreach (var update in agent.RunStreamingAsync("Count to five slowly.", session))
{
    Console.Write(update.Text);
}
```

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `GitHub Copilot CLI was not found on PATH` | `copilot` binary is missing or not on `PATH` | Install from [github.com/github/copilot-cli](https://github.com/github/copilot-cli) and verify with `copilot --version` |
| `Authentication failed` / `401` | Copilot CLI is not signed in | Run `gh auth login` or `copilot auth login` |
| `SquadFolderPath does not exist` | `SQUAD_TEAM_ROOT` points to a non-existent path | Set `SQUAD_TEAM_ROOT` to an initialized Squad team directory |
| `The system cannot find the file specified` (Win32Exception) | Copilot CLI not found | Same as first row above |
| Build error: `Package Squad.Agents.AI not found` | Sample uses a project reference; ensure you are running from the repo root | Run `dotnet build` from the repository root or pass `--project samples/squad-agents-ai-sample/` |

## See Also

- [Squad.Agents.AI full API documentation](../../src/Squad.Agents.AI/README.md)
- [Squad CLI repository and install guide](https://github.com/tamirdresher/squad)
- [Microsoft Agent Framework](https://github.com/microsoft/agents)
- [GitHub Copilot CLI](https://github.com/github/copilot-cli)
