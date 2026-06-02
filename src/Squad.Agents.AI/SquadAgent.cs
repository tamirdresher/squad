using GitHub.Copilot.SDK;
using Microsoft.Agents.AI;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// Microsoft Agent Framework agent that delegates to a GitHub Copilot SDK client configured for a Squad team root.
/// </summary>
/// <remarks>
/// <para>
/// Use <see cref="SquadServiceCollectionExtensions.AddSquadAgent(Microsoft.Extensions.DependencyInjection.IServiceCollection, Action{SquadAgentOptions}?)"/>
/// for DI registration in applications. Direct construction is useful for tests or simple console hosts.
/// </para>
/// <example>
/// <code>
/// var agent = new SquadAgent(new SquadAgentOptions { SquadFolderPath = @"C:\repo" });
/// var response = await agent.RunAsync("Summarize the team.");
/// </code>
/// </example>
/// </remarks>
public sealed class SquadAgent : AIAgent, IAsyncDisposable
{
    private readonly CopilotClient _copilotClient;
    private readonly AIAgent _inner;
    private readonly ILogger? _logger;
    private readonly bool _ownsClient;
    private readonly SquadAgentOptions _options;

    /// <summary>
    /// Initializes a new <see cref="SquadAgent"/> from fully-resolved options and owns the created Copilot client.
    /// </summary>
    /// <param name="options">Options that describe the Squad team root, CLI process, authentication, logging, and instructions.</param>
    /// <param name="loggerFactory">Optional logger factory used for wrapper logs and SDK trace logging when enabled.</param>
    public SquadAgent(SquadAgentOptions options, ILoggerFactory? loggerFactory = null)
        : this(CreateCopilotClient(options, loggerFactory), options, loggerFactory, ownsClient: true)
    {
    }

    /// <summary>
    /// Initializes a new <see cref="SquadAgent"/> from the options pattern.
    /// </summary>
    /// <param name="options">Options wrapper containing the resolved <see cref="SquadAgentOptions"/>.</param>
    /// <param name="loggerFactory">Optional logger factory used for wrapper logs and SDK trace logging when enabled.</param>
    public SquadAgent(IOptions<SquadAgentOptions> options, ILoggerFactory? loggerFactory = null)
        : this(options.Value, loggerFactory)
    {
    }

    private SquadAgent(CopilotClient copilotClient, SquadAgentOptions options, ILoggerFactory? loggerFactory, bool ownsClient)
    {
        _copilotClient = copilotClient ?? throw new ArgumentNullException(nameof(copilotClient));
        _logger = loggerFactory?.CreateLogger<SquadAgent>();
        _ownsClient = ownsClient;
        _options = options;

        // Create the inner AIAgent via AsAIAgent extension — NO CAST
        _inner = _copilotClient.AsAIAgent(
            instructions: options.Instructions,
            name: options.AgentName ?? "Squad");

        _logger?.LogInformation("SquadAgent initialized with name '{AgentName}', team root '{TeamRoot}'",
            options.AgentName, options.SquadFolderPath);
    }

    private static CopilotClient CreateCopilotClient(SquadAgentOptions options, ILoggerFactory? loggerFactory)
    {
        // Resolve token: provider takes precedence over direct property
        string? resolvedToken = null;
        if (options.GitHubTokenProvider is not null)
        {
            // Call provider synchronously (constructor context requires sync)
            resolvedToken = options.GitHubTokenProvider(CancellationToken.None).GetAwaiter().GetResult();
        }
        else
        {
            resolvedToken = options.GitHubToken;
        }

        var clientOptions = new CopilotClientOptions
        {
            CliPath = options.CliPath,
            Cwd = options.Cwd ?? options.SquadFolderPath,
            GitHubToken = resolvedToken
        };

        // Preserve CLI args parsed from connection strings or supplied by user code for the SDK's CLI invocation.
        if (options.CliArgs.Count > 0)
        {
            clientOptions.CliArgs = options.CliArgs.ToArray();
        }

        // Copy environment variables
        if (options.Environment.Count > 0)
        {
            var envDict = new Dictionary<string, string>();
            foreach (var kvp in options.Environment)
            {
                if (kvp.Value != null)
                    envDict[kvp.Key] = kvp.Value;
            }
            clientOptions.Environment = envDict;
        }

        // Set logger if trace events enabled
        if (options.TraceEvents && loggerFactory != null)
        {
            clientOptions.Logger = loggerFactory.CreateLogger<CopilotClient>();
        }

        return new CopilotClient(clientOptions);
    }

    /// <summary>
    /// Gets the display name exposed by this agent.
    /// </summary>
    public override string? Name => _options.AgentName ?? _inner.Name;

    /// <summary>
    /// Gets the agent description exposed by the inner Copilot-backed agent, or a Squad fallback description.
    /// </summary>
    public override string? Description => _inner.Description ?? "Squad multi-agent CLI participant";

    /// <summary>
    /// Creates a new MAF session by delegating to the inner agent.
    /// </summary>
    /// <param name="cancellationToken">Token that cancels session creation.</param>
    /// <returns>A newly-created agent session.</returns>
    protected override ValueTask<AgentSession> CreateSessionCoreAsync(CancellationToken cancellationToken = default)
    {
        return _inner.CreateSessionAsync(cancellationToken);
    }

    /// <summary>
    /// Runs a non-streaming agent turn by delegating to the inner agent.
    /// </summary>
    /// <param name="messages">Messages to send to the agent.</param>
    /// <param name="session">Optional session for multi-turn continuity.</param>
    /// <param name="options">Optional run options.</param>
    /// <param name="cancellationToken">Token that cancels the run.</param>
    /// <returns>The complete agent response.</returns>
    protected override Task<AgentResponse> RunCoreAsync(
        IEnumerable<Microsoft.Extensions.AI.ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.RunAsync(messages, session, options, cancellationToken);
    }

    /// <summary>
    /// Runs a streaming agent turn by delegating to the inner agent.
    /// </summary>
    /// <param name="messages">Messages to send to the agent.</param>
    /// <param name="session">Optional session for multi-turn continuity.</param>
    /// <param name="options">Optional run options.</param>
    /// <param name="cancellationToken">Token that cancels the run.</param>
    /// <returns>An async stream of response updates.</returns>
    protected override IAsyncEnumerable<AgentResponseUpdate> RunCoreStreamingAsync(
        IEnumerable<Microsoft.Extensions.AI.ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.RunStreamingAsync(messages, session, options, cancellationToken);
    }

    /// <summary>
    /// Serializes a session by delegating to the inner agent.
    /// </summary>
    /// <param name="session">Session to serialize.</param>
    /// <param name="jsonSerializerOptions">Optional JSON serializer settings.</param>
    /// <param name="cancellationToken">Token that cancels serialization.</param>
    /// <returns>The serialized session state.</returns>
    protected override ValueTask<JsonElement> SerializeSessionCoreAsync(
        AgentSession session,
        JsonSerializerOptions? jsonSerializerOptions = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.SerializeSessionAsync(session, jsonSerializerOptions, cancellationToken);
    }

    /// <summary>
    /// Deserializes a session by delegating to the inner agent.
    /// </summary>
    /// <param name="sessionState">Serialized session state.</param>
    /// <param name="jsonSerializerOptions">Optional JSON serializer settings.</param>
    /// <param name="cancellationToken">Token that cancels deserialization.</param>
    /// <returns>The deserialized session.</returns>
    protected override ValueTask<AgentSession> DeserializeSessionCoreAsync(
        JsonElement sessionState,
        JsonSerializerOptions? jsonSerializerOptions = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.DeserializeSessionAsync(sessionState, jsonSerializerOptions, cancellationToken);
    }

    /// <summary>
    /// Disposes the owned Copilot client and disposable inner agent resources.
    /// </summary>
    /// <returns>A value task that completes when disposal finishes.</returns>
    public async ValueTask DisposeAsync()
    {
        if (_ownsClient)
        {
            await _copilotClient.DisposeAsync().ConfigureAwait(false);
        }

        if (_inner is IAsyncDisposable innerDisposable)
        {
            await innerDisposable.DisposeAsync().ConfigureAwait(false);
        }

        _logger?.LogDebug("SquadAgent disposed");
    }
}
