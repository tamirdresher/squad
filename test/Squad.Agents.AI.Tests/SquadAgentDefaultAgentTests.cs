using System.Reflection;
using GitHub.Copilot;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Squad.Agents.AI.Tests;

/// <summary>
/// Tests for the 0.5.0 behaviour where SquadAgent auto-sets
/// <see cref="SessionConfigBase.Agent"/> (the SDK's first-class equivalent of
/// the Copilot CLI's <c>--agent</c> flag) to <see cref="SquadAgentOptions.AgentFileName"/>,
/// so the wrapped session picks up <c>.github/agents/squad.agent.md</c> by default —
/// matching <c>copilot --agent squad</c> from the terminal.
/// </summary>
public class SquadAgentDefaultAgentTests : IDisposable
{
    private readonly string _tempRoot;

    public SquadAgentDefaultAgentTests()
    {
        // Each test gets its own throwaway team root so file-existence checks
        // are deterministic and we can scaffold or omit the squad.agent.md file
        // per scenario without contaminating siblings.
        _tempRoot = Path.Combine(Path.GetTempPath(), "squad-agents-ai-tests", Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(_tempRoot);
    }

    public void Dispose()
    {
        try { Directory.Delete(_tempRoot, recursive: true); }
        catch { /* best effort */ }
    }

    private string ScaffoldAgentFile(string agentName)
    {
        var dir = Path.Combine(_tempRoot, ".github", "agents");
        Directory.CreateDirectory(dir);
        var path = Path.Combine(dir, $"{agentName}.agent.md");
        File.WriteAllText(path, $"# {agentName}\n\nstub agent file for tests");
        return path;
    }

    [Fact]
    public void Options_AgentFileName_DefaultsToSquad()
    {
        var options = new SquadAgentOptions();
        Assert.Equal("squad", options.AgentFileName);
    }

    [Fact]
    public void AddSquadAgent_AutoSetsSessionConfigAgentToSquad_WhenSquadAgentMdExists()
    {
        ScaffoldAgentFile("squad");

        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
        });

        var sessionConfig = GetInnerSessionConfig(agent);
        Assert.Equal("squad", sessionConfig.Agent);
    }

    [Fact]
    public void AddSquadAgent_LeavesAgentUnset_WhenAgentFileMissing()
    {
        // No .github/agents/squad.agent.md scaffolded — the SDK should NOT
        // set sessionConfig.Agent because the underlying session would error
        // when asked to load a non-existent agent.
        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
        });

        var sessionConfig = GetInnerSessionConfig(agent);
        Assert.Null(sessionConfig.Agent);
    }

    [Fact]
    public void AddSquadAgent_RespectsCustomAgentFileName_WhenFileExists()
    {
        ScaffoldAgentFile("data");

        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
            opts.AgentFileName = "data";
        });

        var sessionConfig = GetInnerSessionConfig(agent);
        Assert.Equal("data", sessionConfig.Agent);
    }

    [Fact]
    public void AddSquadAgent_LeavesAgentUnset_WhenAgentFileNameIsNull()
    {
        // Opt-out: setting AgentFileName=null disables the auto-set even if
        // squad.agent.md exists. Used when the consumer wants to drive the
        // session with a custom SystemMessage instead of an agent file.
        ScaffoldAgentFile("squad");

        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
            opts.AgentFileName = null;
        });

        var sessionConfig = GetInnerSessionConfig(agent);
        Assert.Null(sessionConfig.Agent);
    }

    [Fact]
    public void AddSquadAgent_LeavesAgentUnset_WhenAgentFileNameIsWhitespace()
    {
        ScaffoldAgentFile("squad");

        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
            opts.AgentFileName = "   ";
        });

        var sessionConfig = GetInnerSessionConfig(agent);
        Assert.Null(sessionConfig.Agent);
    }

    [Fact]
    public void AddSquadAgent_ConfigureSession_CanOverrideAutoSetAgent()
    {
        // ConfigureSession runs AFTER the default is applied, so consumers retain
        // full control — they can replace the auto-set value with anything else
        // (or null it out) from inside their own callback.
        ScaffoldAgentFile("squad");
        ScaffoldAgentFile("custom");

        var agent = CreateAgent(opts =>
        {
            opts.SquadFolderPath = _tempRoot;
            opts.Cwd = _tempRoot;
            opts.ConfigureSession = sessionConfig =>
            {
                // Confirm the default was applied before this callback ran.
                Assert.Equal("squad", sessionConfig.Agent);
                sessionConfig.Agent = "custom";
            };
        });

        var actualSessionConfig = GetInnerSessionConfig(agent);
        Assert.Equal("custom", actualSessionConfig.Agent);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private static SquadAgent CreateAgent(Action<SquadAgentOptions> configure)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddLogging();
        services.AddSquadAgent(opts =>
        {
            opts.CliPath = @"C:\fake-copilot\copilot.exe";
            configure(opts);
        });
        return services.BuildServiceProvider().GetRequiredService<SquadAgent>();
    }

    /// <summary>
    /// Reach into the SquadAgent → DelegatingAIAgent.InnerAgent → ChatClientAgent.SessionConfig
    /// to assert against the SessionConfig the SDK was constructed with.
    /// </summary>
    private static SessionConfig GetInnerSessionConfig(SquadAgent agent)
    {
        var innerProp = typeof(Microsoft.Agents.AI.DelegatingAIAgent).GetProperty(
            "InnerAgent",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        Assert.NotNull(innerProp);
        var inner = innerProp!.GetValue(agent);
        Assert.NotNull(inner);

        var configField = inner!.GetType().GetField(
            "_sessionConfig",
            BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(configField);
        var config = configField!.GetValue(inner);
        Assert.NotNull(config);
        return (SessionConfig)config!;
    }
}
