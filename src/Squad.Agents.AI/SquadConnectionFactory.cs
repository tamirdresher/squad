namespace Squad.Agents.AI;

/// <summary>
/// Static factory that parses connection strings emitted by CommunityToolkit.Aspire.Hosting.Squad.
/// </summary>
public static class SquadConnectionFactory
{
    /// <summary>
    /// Parses a Squad connection string into SquadAgentOptions.
    ///
    /// Supported formats (Hybrid wire — Q1 lock):
    ///
    ///   1) PATH form (default — emitted when SquadFolderPath only):
    ///        "C:\path\to\team-root"
    ///        "/Users/me/team-root"
    ///      Maps directly to SquadFolderPath. Cwd defaults to same.
    ///
    ///   2) URI form (escape hatch — when extra knobs needed):
    ///        "squad://localhost?teamRoot=...&amp;cliPath=...&amp;protocol=maf-1.0"
    ///      Reserved for future AFCP (Agent-to-Agent Framework
    ///      Communication Protocol) support where host:port matters. For now
    ///      we only parse query params; host is ignored.
    /// </summary>
    public static SquadAgentOptions FromConnectionString(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new ArgumentException("Connection string cannot be null or empty.", nameof(connectionString));
        }

        var options = new SquadAgentOptions();

        if (connectionString.StartsWith("squad://", StringComparison.OrdinalIgnoreCase))
        {
            // URI form
            var uri = new Uri(connectionString);
            var query = ParseQueryString(uri.Query);

            if (query.TryGetValue("teamRoot", out var teamRoot))
                options.SquadFolderPath = teamRoot;
            
            if (query.TryGetValue("cliPath", out var cliPath))
                options.CliPath = cliPath;
            
            if (query.TryGetValue("cwd", out var cwd))
                options.Cwd = cwd;
            
            if (query.TryGetValue("cliArgs", out var cliArgsString))
            {
                foreach (var arg in cliArgsString.Split(';', StringSplitOptions.RemoveEmptyEntries))
                {
                    options.CliArgs.Add(arg);
                }
            }

            // Parse environment variables if present (format: key1=val1;key2=val2)
            if (query.TryGetValue("env", out var envString))
            {
                foreach (var pair in envString.Split(';', StringSplitOptions.RemoveEmptyEntries))
                {
                    var parts = pair.Split('=', 2);
                    if (parts.Length == 2)
                    {
                        options.Environment[parts[0]] = parts[1];
                    }
                }
            }
        }
        else
        {
            // PATH form — treat entire string as team root path
            options.SquadFolderPath = connectionString;
            options.Cwd = connectionString;
        }

        return options;
    }

    private static Dictionary<string, string> ParseQueryString(string query)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        
        if (string.IsNullOrEmpty(query))
            return result;

        // Remove leading '?' if present
        if (query.StartsWith('?'))
            query = query.Substring(1);

        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = pair.Split('=', 2);
            if (parts.Length == 2)
            {
                result[Uri.UnescapeDataString(parts[0])] = Uri.UnescapeDataString(parts[1]);
            }
        }

        return result;
    }
}
