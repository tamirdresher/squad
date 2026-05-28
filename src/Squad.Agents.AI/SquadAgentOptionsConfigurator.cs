using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Squad.Agents.AI;

/// <summary>
/// Binds SquadAgentOptions from ConnectionStrings:squad configuration section.
/// Runs before user-supplied configure lambda; user settings always win.
/// </summary>
internal sealed class SquadAgentOptionsConfigurator : IConfigureOptions<SquadAgentOptions>
{
    private readonly IConfiguration _configuration;

    public SquadAgentOptionsConfigurator(IConfiguration configuration)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    }

    public void Configure(SquadAgentOptions options)
    {
        var connectionString = _configuration.GetConnectionString("squad");
        
        if (string.IsNullOrWhiteSpace(connectionString))
            return;

        var parsedOptions = SquadConnectionFactory.FromConnectionString(connectionString);

        // Only apply parsed values if user hasn't set them explicitly
        // User callback runs AFTER this configurator, so any null/empty here will be overridden
        if (string.IsNullOrWhiteSpace(options.SquadFolderPath))
            options.SquadFolderPath = parsedOptions.SquadFolderPath;

        if (string.IsNullOrWhiteSpace(options.CliPath))
            options.CliPath = parsedOptions.CliPath;

        if (string.IsNullOrWhiteSpace(options.Cwd))
            options.Cwd = parsedOptions.Cwd;

        // Merge CLI args (append to existing list)
        foreach (var arg in parsedOptions.CliArgs)
        {
            if (!options.CliArgs.Contains(arg))
                options.CliArgs.Add(arg);
        }

        // Merge environment variables (don't overwrite existing)
        foreach (var kvp in parsedOptions.Environment)
        {
            if (!options.Environment.ContainsKey(kvp.Key))
                options.Environment[kvp.Key] = kvp.Value;
        }
    }
}
