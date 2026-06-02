using Microsoft.Agents.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// Extension methods for registering <see cref="SquadAgent"/> in dependency injection.
/// </summary>
public static class SquadServiceCollectionExtensions
{
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
        => AddSquadAgent(services, ServiceLifetime.Scoped, configure);

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
    {
        // Register connection string configurator FIRST (runs before user callback)
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IConfigureOptions<SquadAgentOptions>, SquadAgentOptionsConfigurator>());

        if (configure is not null)
        {
            services.Configure(configure);
        }

        // Register SquadAgent with specified lifetime
        services.Add(new ServiceDescriptor(
            typeof(SquadAgent),
            typeof(SquadAgent),
            lifetime));

        // AIAgent base registration — so consumers can resolve via IEnumerable<AIAgent>
        services.Add(new ServiceDescriptor(
            typeof(AIAgent),
            sp => sp.GetRequiredService<SquadAgent>(),
            lifetime));

        // TraceEvents=true → warn because verbose traces can contain sensitive details
        services.AddOptions<SquadAgentOptions>()
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
}
