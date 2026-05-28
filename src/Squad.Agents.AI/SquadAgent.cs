using GitHub.Copilot.SDK;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// A Squad-flavored <see cref="IChatClient"/> that composes a GitHub Copilot
/// client configured for Squad multi-agent CLI.
///
/// Value-add over bare Copilot SDK:
/// <list type="bullet">
///   <item>Squad boundary instructions injected at construction time.</item>
///   <item>Squad-specific configuration (team root, CLI path, env vars).</item>
///   <item>DI-friendly: registered via <see cref="SquadServiceCollectionExtensions.AddSquadAgent"/>.</item>
/// </list>
/// </summary>
public sealed class SquadAgent : IChatClient, IAsyncDisposable
{
    private readonly CopilotClient _copilotClient;
    private readonly IChatClient _inner;
    private readonly ILogger? _logger;
    private readonly bool _ownsClient;
    private readonly ChatClientMetadata _metadata;

    /// <summary>
    /// Initializes a <see cref="SquadAgent"/> from fully-resolved options.
    /// The <see cref="CopilotClient"/> is created and owned by this instance.
    /// </summary>
    public SquadAgent(SquadAgentOptions options, ILoggerFactory? loggerFactory = null)
        : this(CreateCopilotClient(options, loggerFactory), options, loggerFactory, ownsClient: true)
    {
    }

    /// <summary>
    /// Initializes a <see cref="SquadAgent"/> from IOptions pattern.
    /// </summary>
    public SquadAgent(IOptions<SquadAgentOptions> options, ILoggerFactory? loggerFactory = null)
        : this(options.Value, loggerFactory)
    {
    }

    private SquadAgent(CopilotClient copilotClient, SquadAgentOptions options, ILoggerFactory? loggerFactory, bool ownsClient)
    {
        _copilotClient = copilotClient ?? throw new ArgumentNullException(nameof(copilotClient));
        _logger = loggerFactory?.CreateLogger<SquadAgent>();
        _ownsClient = ownsClient;

        // Create the inner AIAgent via AsAIAgent extension, then get IChatClient
        var agent = _copilotClient.AsAIAgent(
            instructions: options.Instructions,
            name: options.AgentName ?? "Squad");

        // Cast to IChatClient (AIAgent should implement it, but types are in different assemblies)
        _inner = (IChatClient)(object)agent;

        _metadata = new ChatClientMetadata("Squad");

        _logger?.LogInformation("SquadAgent initialized with name '{AgentName}', team root '{TeamRoot}'",
            options.AgentName, options.SquadFolderPath);
    }

    private static CopilotClient CreateCopilotClient(SquadAgentOptions options, ILoggerFactory? loggerFactory)
    {
        var clientOptions = new CopilotClientOptions
        {
            CliPath = options.CliPath,
            Cwd = options.Cwd ?? options.SquadFolderPath,
            GitHubToken = options.GitHubToken
        };

        // Copy CLI args
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

    // IChatClient implementation

    public ChatClientMetadata Metadata => _metadata;

    public Task<ChatResponse> GetResponseAsync(
        IEnumerable<ChatMessage> chatMessages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.GetResponseAsync(chatMessages, options, cancellationToken);
    }

    public IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
        IEnumerable<ChatMessage> chatMessages,
        ChatOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        return _inner.GetStreamingResponseAsync(chatMessages, options, cancellationToken);
    }

    public object? GetService(Type serviceType, object? serviceKey = null)
    {
        if (serviceType == typeof(IChatClient))
            return this;

        return _inner.GetService(serviceType, serviceKey);
    }

    public TService? GetService<TService>(object? key = null) where TService : class
    {
        if (typeof(TService) == typeof(IChatClient))
            return this as TService;

        // Delegate to inner client's GetService via extension method
        return ChatClientExtensions.GetService<TService>(_inner, key);
    }

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
        else if (_inner is IDisposable innerSync)
        {
            innerSync.Dispose();
        }

        _logger?.LogDebug("SquadAgent disposed");
    }

    void IDisposable.Dispose()
    {
        // Sync dispose not supported; call DisposeAsync
        throw new NotSupportedException("Use DisposeAsync() instead of Dispose().");
    }
}
