using Microsoft.Agents.AI;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// Extension methods for registering <see cref="SquadAgent"/> in dependency injection.
/// </summary>
public static class SquadServiceCollectionExtensions
{
    internal const string DefaultConnectionStringName = "squad";

    /// <summary>
    /// Registers <see cref="SquadAgent"/> and base <see cref="AIAgent"/> with scoped lifetime.
    /// </summary>
    /// <param name="services">Service collection to update.</param>
    /// <param name="configure">Optional callback that customizes <see cref="SquadAgentOptions"/> after connection-string binding.</param>
    /// <returns>The same <paramref name="services"/> instance for chaining.</returns>
    /// <example>
    /// <code>
    /// builder.Services.AddSquadAgent(o => o.SquadFolderPath = @"C:\repo");
    /// </code>
    /// </example>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        Action<SquadAgentOptions>? configure = null)
        => AddSquadAgentCore(services, name: null, ServiceLifetime.Scoped, configure);

    /// <summary>
    /// Registers <see cref="SquadAgent"/> and base <see cref="AIAgent"/> with scoped lifetime using a named connection string.
    /// </summary>
    /// <param name="services">Service collection to update.</param>
    /// <param name="name">Logical Squad name. For example, <c>"research"</c> reads <c>ConnectionStrings:squad-research</c>.</param>
    /// <param name="configure">Optional callback that customizes <see cref="SquadAgentOptions"/> after connection-string binding.</param>
    /// <returns>The same <paramref name="services"/> instance for chaining.</returns>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        string name,
        Action<SquadAgentOptions>? configure = null)
        => AddSquadAgentCore(services, name, ServiceLifetime.Scoped, configure);

    /// <summary>
    /// Registers <see cref="SquadAgent"/> and base <see cref="AIAgent"/> with the specified lifetime.
    /// </summary>
    /// <param name="services">Service collection to update.</param>
    /// <param name="lifetime">Lifetime used for the concrete and base agent registrations.</param>
    /// <param name="configure">Optional callback that customizes <see cref="SquadAgentOptions"/> after connection-string binding.</param>
    /// <returns>The same <paramref name="services"/> instance for chaining.</returns>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        ServiceLifetime lifetime,
        Action<SquadAgentOptions>? configure = null)
        => AddSquadAgentCore(services, name: null, lifetime, configure);

    /// <summary>
    /// Registers <see cref="SquadAgent"/> and base <see cref="AIAgent"/> with the specified lifetime using a named connection string.
    /// </summary>
    /// <param name="services">Service collection to update.</param>
    /// <param name="name">Logical Squad name. For example, <c>"research"</c> reads <c>ConnectionStrings:squad-research</c>.</param>
    /// <param name="lifetime">Lifetime used for the concrete and base agent registrations.</param>
    /// <param name="configure">Optional callback that customizes <see cref="SquadAgentOptions"/> after connection-string binding.</param>
    /// <returns>The same <paramref name="services"/> instance for chaining.</returns>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        string name,
        ServiceLifetime lifetime,
        Action<SquadAgentOptions>? configure = null)
        => AddSquadAgentCore(services, name, lifetime, configure);

    private static IServiceCollection AddSquadAgentCore(
        IServiceCollection services,
        string? name,
        ServiceLifetime lifetime,
        Action<SquadAgentOptions>? configure)
    {
        ArgumentNullException.ThrowIfNull(services);

        var optionsName = GetOptionsName(name);
        var connectionStringName = GetConnectionStringName(name);

        // Register connection string configurator FIRST (runs before user callback)
        services.AddSingleton<IConfigureOptions<SquadAgentOptions>>(sp =>
            new SquadAgentOptionsConfigurator(
                sp.GetRequiredService<IConfiguration>(),
                optionsName,
                connectionStringName));

        if (configure is not null)
        {
            services.Configure(optionsName, configure);
        }

        // Register SquadAgent with specified lifetime
        services.Add(new ServiceDescriptor(
            typeof(SquadAgent),
            sp =>
            {
                var options = sp.GetRequiredService<IOptionsMonitor<SquadAgentOptions>>().Get(optionsName);
                return ActivatorUtilities.CreateInstance<SquadAgent>(sp, options);
            },
            lifetime));

        // AIAgent base registration — so consumers can resolve via IEnumerable<AIAgent>
        services.Add(new ServiceDescriptor(
            typeof(AIAgent),
            sp => sp.GetRequiredService<SquadAgent>(),
            lifetime));

        // TraceEvents=true → warn because verbose traces can contain sensitive details
        services.AddOptions<SquadAgentOptions>(optionsName)
            .PostConfigure<ILoggerFactory>((opts, loggerFactory) =>
            {
                if (opts.TraceEvents)
                {
                    var logger = loggerFactory.CreateLogger("Squad.Agents.AI.Startup");
                    logger.LogWarning(
                        "SquadAgentOptions.TraceEvents=true. Verbose tracing is enabled; " +
                        "not recommended for production use.");
                }
            });

        return services;
    }

    private static string GetOptionsName(string? name)
    {
        return string.IsNullOrWhiteSpace(name) ? Options.DefaultName : name;
    }

    private static string GetConnectionStringName(string? name)
    {
        return string.IsNullOrWhiteSpace(name) ? DefaultConnectionStringName : $"{DefaultConnectionStringName}-{name}";
    }
}
