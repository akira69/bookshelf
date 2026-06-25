using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using NLog;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Processes;
using NzbDrone.Core.Configuration;

namespace NzbDrone.Core.MediaFiles.AudiobookConversion
{
    public interface IM4bToolService
    {
        M4bToolCommand GetCommand(string configuredPath = null);
        M4bToolDependencyStatus GetDependencyStatus(string configuredPath = null);
    }

    public class M4bToolService : IM4bToolService
    {
        private const string DefaultToolPath = "m4b-tool";

        private readonly IConfigService _configService;
        private readonly IProcessProvider _processProvider;
        private readonly Logger _logger;

        public M4bToolService(IConfigService configService,
                              IProcessProvider processProvider,
                              Logger logger)
        {
            _configService = configService;
            _processProvider = processProvider;
            _logger = logger;
        }

        public M4bToolCommand GetCommand(string configuredPath = null)
        {
            configuredPath = configuredPath.IsNullOrWhiteSpace() ? _configService.M4bToolPath : configuredPath;
            configuredPath = configuredPath.IsNullOrWhiteSpace() ? DefaultToolPath : configuredPath.Trim();

            if (configuredPath.EndsWith(".phar", StringComparison.OrdinalIgnoreCase))
            {
                return new M4bToolCommand
                {
                    Executable = "php",
                    ArgumentsPrefix = Quote(configuredPath),
                    DisplayPath = configuredPath
                };
            }

            return new M4bToolCommand
            {
                Executable = configuredPath,
                ArgumentsPrefix = string.Empty,
                DisplayPath = configuredPath
            };
        }

        public M4bToolDependencyStatus GetDependencyStatus(string configuredPath = null)
        {
            var command = GetCommand(configuredPath);
            var dependencies = new List<M4bToolDependencyStatusItem>
            {
                CheckM4bTool(command, true),
                CheckExecutable("php", "--version", "PHP", true),
                CheckExecutable("ffmpeg", "-version", "FFmpeg", true),
                CheckExecutable("ffprobe", "-version", "FFprobe", true),
                CheckExecutable("mp4chaps", "--version", "mp4chaps", false)
            };

            return new M4bToolDependencyStatus
            {
                ToolPath = command.DisplayPath,
                Dependencies = dependencies,
                IsReady = dependencies.Where(d => d.Required).All(d => d.Available)
            };
        }

        private M4bToolDependencyStatusItem CheckM4bTool(M4bToolCommand command, bool required)
        {
            var args = JoinArguments(command.ArgumentsPrefix, "--version");
            return CheckExecutable(command.Executable, args, "m4b-tool", required);
        }

        private M4bToolDependencyStatusItem CheckExecutable(string executable, string args, string name, bool required)
        {
            var item = new M4bToolDependencyStatusItem
            {
                Name = name,
                Required = required
            };

            try
            {
                var output = _processProvider.StartAndCapture(executable, args);
                item.Available = output.ExitCode == 0;
                item.Version = output.Standard.Concat(output.Error)
                                     .Select(l => l.Content)
                                     .FirstOrDefault(s => s.IsNotNullOrWhiteSpace());

                if (!item.Available)
                {
                    item.Error = output.Error.Concat(output.Standard)
                                       .Select(l => l.Content)
                                       .Where(s => s.IsNotNullOrWhiteSpace())
                                       .ConcatToString(" | ");
                }
            }
            catch (Win32Exception ex)
            {
                item.Available = false;
                item.Error = ex.Message;
            }
            catch (Exception ex)
            {
                item.Available = false;
                item.Error = ex.Message;
                _logger.Debug(ex, "Unable to check {0}", name);
            }

            return item;
        }

        public static string JoinArguments(params string[] args)
        {
            return args.Where(a => a.IsNotNullOrWhiteSpace()).ConcatToString(" ");
        }

        public static string Quote(string value)
        {
            return $"\"{value.Replace("\"", "\\\"")}\"";
        }

    }
}
