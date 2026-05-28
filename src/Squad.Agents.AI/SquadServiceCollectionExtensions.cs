using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// DI extension methods for registering <see cref="SquadAgent"/>.
/// </summary>
public static class SquadServiceCollectionExtensions
{
    /// <summary>Register SquadAgent as a scoped IChatClient.</summary>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        Action<SquadAgentOptions>? configure = null)
        => AddSquadAgent(services, ServiceLifetime.Scoped, configure);

    /// <summary>Register SquadAgent with specified lifetime.</summary>
    public static IServiceCollection AddSquadAgent(
        this IServiceCollection services,
        ServiceLifetime lifetime,
        Action<SquadAgentOptions>? configure = null)
    {
        if (configure is not null)
        {
            services.Configure(configure);
        }

        // Register SquadAgent with specified lifetime
        services.Add(new ServiceDescriptor(
            typeof(SquadAgent),
            typeof(SquadAgent),
            lifetime));

        // IChatClient base registration — so consumers can resolve via IEnumerable<IChatClient>
        services.Add(new ServiceDescriptor(
            typeof(IChatClient),
            sp => sp.GetRequiredService<SquadAgent>(),
            lifetime));

        // TraceEvents=true outside Development → warn
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
