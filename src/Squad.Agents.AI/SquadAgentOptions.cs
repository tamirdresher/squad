namespace Squad.Agents.AI;

/// <summary>
/// Configuration for <see cref="SquadAgent"/>. Bind from "SquadAgent"
/// configuration section (appsettings.json) or Aspire ConnectionStrings via
/// <see cref="SquadConnectionFactory"/>.
/// </summary>
public sealed class SquadAgentOptions
{
    /// <summary>Path to the Squad team root (folder containing .squad/).</summary>
    public string? SquadFolderPath { get; set; }

    /// <summary>Override the Squad CLI executable path. If null, uses CopilotClient default.</summary>
    public string? CliPath { get; set; }

    /// <summary>Extra CLI args to pass to the Squad/Copilot CLI process.</summary>
    public IList<string> CliArgs { get; } = new List<string>();

    /// <summary>Working directory for the CLI process. Defaults to SquadFolderPath.</summary>
    public string? Cwd { get; set; }

    /// <summary>Environment variables to inject into the CLI process.</summary>
    public IDictionary<string, string?> Environment { get; } = new Dictionary<string, string?>();

    /// <summary>GitHub token for Copilot CLI auth. Honors GH_TOKEN env if null.</summary>
    public string? GitHubToken { get; set; }

    /// <summary>
    /// Enables verbose tracing through ILogger. Default false. If set true outside
    /// Development environments, AddSquadAgent logs a warning to discourage prod use.
    /// </summary>
    public bool TraceEvents { get; set; } = false;

    /// <summary>Optional display name for the resulting AIAgent. Defaults to "Squad".</summary>
    public string AgentName { get; set; } = "Squad";

    /// <summary>Optional system message / instructions passed as SessionConfig.SystemMessage.</summary>
    public string? Instructions { get; set; }
}
