namespace Squad.Agents.AI;

/// <summary>
/// Configures <see cref="SquadAgent"/> construction, connection-string binding, and Copilot CLI process settings.
/// </summary>
/// <example>
/// <code>
/// var options = new SquadAgentOptions
/// {
///     SquadFolderPath = @"C:\repo",
///     GitHubTokenProvider = _ => ValueTask.FromResult(Environment.GetEnvironmentVariable("GH_TOKEN"))
/// };
/// options.CliArgs.Add("--yolo");
/// </code>
/// </example>
public sealed class SquadAgentOptions
{
    /// <summary>
    /// Gets or sets the Squad team root, normally the repository or directory that contains the `.squad` folder.
    /// </summary>
    public string? SquadFolderPath { get; set; }

    /// <summary>
    /// Gets or sets an explicit Copilot CLI executable path. When unset, the SDK resolves the default CLI from `PATH`.
    /// </summary>
    public string? CliPath { get; set; }

    /// <summary>
    /// Gets additional CLI arguments appended when the Copilot CLI process is started.
    /// </summary>
    public IList<string> CliArgs { get; } = new List<string>();

    /// <summary>
    /// Gets or sets the CLI process working directory. When unset, <see cref="SquadFolderPath"/> is used.
    /// </summary>
    public string? Cwd { get; set; }

    /// <summary>
    /// Gets additional environment variables injected into the CLI process.
    /// </summary>
    public IDictionary<string, string?> Environment { get; } = new Dictionary<string, string?>();

    /// <summary>
    /// Gets or sets a direct GitHub token for local development scenarios.
    /// </summary>
    /// <remarks>
    /// The value is ignored by JSON serialization and redacted by <see cref="ToString"/>, but still lives in the options object.
    /// Prefer <see cref="GitHubTokenProvider"/> for production hosts.
    /// </remarks>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? GitHubToken { get; set; }

    /// <summary>
    /// Gets or sets the callback that provides a GitHub token during agent construction.
    /// </summary>
    /// <remarks>
    /// When set, this provider takes precedence over <see cref="GitHubToken"/>.
    /// </remarks>
    public Func<CancellationToken, ValueTask<string?>>? GitHubTokenProvider { get; set; }

    /// <summary>
    /// Gets or sets whether verbose Copilot SDK logging is enabled.
    /// </summary>
    /// <remarks>
    /// The DI registration emits a startup warning whenever this is enabled because traces may contain sensitive details.
    /// </remarks>
    public bool TraceEvents { get; set; } = false;

    /// <summary>
    /// Gets or sets the display name for the resulting <see cref="Microsoft.Agents.AI.AIAgent"/>.
    /// </summary>
    public string AgentName { get; set; } = "Squad";

    /// <summary>
    /// Gets or sets optional system instructions passed to the inner Copilot-backed agent.
    /// </summary>
    public string? Instructions { get; set; }

    /// <summary>
    /// Returns a diagnostic representation with sensitive values redacted.
    /// </summary>
    /// <returns>A string containing non-secret option values.</returns>
    public override string ToString()
    {
        return $"SquadAgentOptions {{ SquadFolderPath = {SquadFolderPath}, AgentName = {AgentName}, " +
               $"GitHubToken = [REDACTED], TraceEvents = {TraceEvents} }}";
    }
}
