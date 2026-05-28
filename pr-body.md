> ⚠️ DRAFT — Tamir tests locally before this goes ready-for-review

## What this adds

`Squad.Agents.AI` — a community NuGet that exposes the Squad multi-agent CLI as a `Microsoft.Extensions.AI.IChatClient`, composable into any MAF app or workflow.

## Design refs (in `tamirdresher_microsoft/tamresearch1`)

- `.squad/decisions.md` Decisions 441, 443, 444, 447 — full Q1–Q7 design lock
- Decision 441 SDK probe — `GitHubCopilotAgent` is sealed → compose via `AsAIAgent`; `CopilotClientOptions` exposes all needed knobs
- Decision 447 Q1–Q7 lock — TFM net10, naming `Squad.Agents.AI`, no `ExtensionSlug`, Hybrid PATH+URI wire format

## How to test locally

1. Clone this branch:
   ```powershell
   gh repo clone tamirdresher/squad
   cd squad
   gh pr checkout <PR-NUMBER>
   ```

2. Build:
   ```powershell
   cd src/Squad.Agents.AI
   dotnet build -c Release
   dotnet pack -c Release -o ../../artifacts
   ```

3. Sanity-check the package metadata:
   ```powershell
   ls ../../artifacts/Squad.Agents.AI.*.nupkg
   ```

4. Wire into a test console app:
   ```powershell
   mkdir ..\TestSquadAgent
   cd ..\TestSquadAgent
   dotnet new console
   dotnet add package Squad.Agents.AI --source ..\..\artifacts --prerelease
   ```

   Then in `Program.cs`:
   ```csharp
   using Microsoft.Extensions.AI;
   using Microsoft.Extensions.DependencyInjection;
   using Squad.Agents.AI;

   var services = new ServiceCollection();
   services.AddSquadAgent(opts =>
   {
       opts.SquadFolderPath = @"C:\path\to\your\team-root";
       opts.GitHubToken = Environment.GetEnvironmentVariable("GH_TOKEN");
   });
   
   var provider = services.BuildServiceProvider();
   var squad = provider.GetRequiredService<SquadAgent>();
   var resp = await squad.GetResponseAsync(
       new[] { new ChatMessage(ChatRole.User, "hello squad, who are you?") }
   );
   Console.WriteLine(resp.Message.Text);
   ```

5. Verify the Squad CLI launches, the demo prints a sensible response.

## What's NOT in this PR

- Unit tests — deferred to follow-up (v0.2)
- Multi-target TFM — `net10.0` only per Q6 lock
- `.WithSquadCli()` / process spawning on the Aspire side — that's Track B (`CommunityToolkit.Aspire.Hosting.Squad`); separate PR in `tamirdresher/Aspire-1`

## Known issues / Tamir to verify

1. **Package version** — `Microsoft.Agents.AI.GitHub.Copilot 1.7.0-preview.260526.1` from Decision 441 may need update if a newer preview exists. Check with `nuget search Microsoft.Agents.AI.GitHub.Copilot -PreRelease`.

2. **API surface alignment** — Implementation uses `IChatClient` from `Microsoft.Extensions.AI 10.6.0`, composing `AsAIAgent()` from `Microsoft.Agents.AI.GitHub.Copilot`. The cast from `AIAgent` → `IChatClient` is via `(IChatClient)(object)agent` — if MAF types change, this may need adjustment.

3. **Build warnings** — XML doc comments missing for some public methods (non-blocking). Can be resolved in v0.2.

## Co-author

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
