using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Abstractions;
using System.Linq;
using System.Text;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Common.Processes;
using NzbDrone.Core.Configuration;
using NzbDrone.Core.MediaFiles.BookImport;

namespace NzbDrone.Core.MediaFiles.AudiobookConversion
{
    public interface IAudiobookConversionService
    {
        AudiobookConversionResult ConvertIfNeeded(string sourcePath, List<IFileInfo> bookFiles);
        void Cleanup(AudiobookConversionResult result, ImportMode importMode, bool importSucceeded);
    }

    public class AudiobookConversionService : IAudiobookConversionService
    {
        private static readonly HashSet<string> ConvertibleAudioExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            ".mp2",
            ".mp3",
            ".wma",
            ".m4a",
            ".m4p",
            ".aac",
            ".mp4a",
            ".ogg",
            ".oga",
            ".vorbis"
        };

        private readonly IConfigService _configService;
        private readonly IDiskProvider _diskProvider;
        private readonly IProcessProvider _processProvider;
        private readonly IM4bToolService _m4bToolService;
        private readonly Logger _logger;

        public AudiobookConversionService(IConfigService configService,
                                          IDiskProvider diskProvider,
                                          IProcessProvider processProvider,
                                          IM4bToolService m4bToolService,
                                          Logger logger)
        {
            _configService = configService;
            _diskProvider = diskProvider;
            _processProvider = processProvider;
            _m4bToolService = m4bToolService;
            _logger = logger;
        }

        public AudiobookConversionResult ConvertIfNeeded(string sourcePath, List<IFileInfo> bookFiles)
        {
            var result = new AudiobookConversionResult(bookFiles);

            if (!_configService.ConvertAudiobooksToM4b)
            {
                return result;
            }

            var audioFiles = bookFiles
                .Where(f => MediaFileExtensions.AudioExtensions.Contains(f.Extension))
                .OrderBy(f => PadNumbers(Path.GetFileName(f.FullName)))
                .ThenBy(f => f.FullName)
                .ToList();

            if (!audioFiles.Any())
            {
                return result;
            }

            if (audioFiles.Count == 1 && audioFiles[0].Extension.Equals(".m4b", StringComparison.OrdinalIgnoreCase))
            {
                return result;
            }

            if (!audioFiles.Any(f => ConvertibleAudioExtensions.Contains(f.Extension)))
            {
                return result;
            }

            if (_configService.M4bToolPath.IsNullOrWhiteSpace())
            {
                throw new AudiobookConversionException("M4B conversion is enabled but no m4b-tool path is configured.");
            }

            var command = _m4bToolService.GetCommand();
            var workRoot = _configService.M4bConversionWorkingDirectory;
            if (workRoot.IsNullOrWhiteSpace())
            {
                workRoot = Path.Combine(Path.GetTempPath(), "bookshelf-m4b");
            }

            var workDir = Path.Combine(workRoot, Guid.NewGuid().ToString("N"));
            var inputDir = Path.Combine(workDir, "input");
            var outputDir = Path.Combine(workDir, "output");
            _diskProvider.EnsureFolder(inputDir);
            _diskProvider.EnsureFolder(outputDir);

            try
            {
                for (var i = 0; i < audioFiles.Count; i++)
                {
                    var source = audioFiles[i].FullName;
                    var target = Path.Combine(inputDir, $"{i + 1:0000} - {Path.GetFileName(source)}");
                    _diskProvider.CopyFile(source, target, true);
                }

                var outputFile = Path.Combine(outputDir, $"{SafeFileName(Path.GetFileNameWithoutExtension(sourcePath))}.m4b");
                var logFile = Path.Combine(outputDir, $"{SafeFileName(Path.GetFileNameWithoutExtension(sourcePath))}.log");
                var args = BuildM4bToolArguments(inputDir, outputFile, logFile, audioFiles);
                args = M4bToolService.JoinArguments(command.ArgumentsPrefix, args);

                _logger.Info("Converting audiobook import to M4B: {0}", sourcePath);
                var output = _processProvider.StartAndCapture(command.Executable, args);

                if (output.ExitCode != 0)
                {
                    var error = output.Error.Concat(output.Standard).Select(l => l.Content).Where(s => s.IsNotNullOrWhiteSpace()).ConcatToString(" | ");
                    throw new AudiobookConversionException($"m4b-tool failed with exit code {output.ExitCode}: {error}");
                }

                if (!_diskProvider.FileExists(outputFile))
                {
                    throw new AudiobookConversionException($"m4b-tool completed but did not create expected output file: {outputFile}");
                }

                result = new AudiobookConversionResult(new List<IFileInfo> { _diskProvider.GetFileInfo(outputFile) })
                {
                    Converted = true,
                    WorkingDirectory = workDir,
                    SourcePath = sourcePath
                };

                return result;
            }
            catch (AudiobookConversionException)
            {
                CleanupWorkDirectory(workDir);
                throw;
            }
            catch (Exception ex)
            {
                CleanupWorkDirectory(workDir);
                throw new AudiobookConversionException($"Failed to convert audiobook import to M4B: {ex.Message}", ex);
            }
        }

        public void Cleanup(AudiobookConversionResult result, ImportMode importMode, bool importSucceeded)
        {
            if (result == null || !result.Converted)
            {
                return;
            }

            try
            {
                if (importSucceeded)
                {
                    var sourceAction = _configService.M4bConversionSourceAction;
                    if (sourceAction == M4bConversionSourceAction.Delete ||
                        (sourceAction == M4bConversionSourceAction.FollowImportMode && importMode == ImportMode.Move))
                    {
                        DeleteSource(result.SourcePath);
                    }
                }
            }
            finally
            {
                CleanupWorkDirectory(result.WorkingDirectory);
            }
        }

        private string BuildM4bToolArguments(string inputDir, string outputFile, string logFile, List<IFileInfo> sourceFiles)
        {
            var args = new List<string>
            {
                "merge",
                Quote(inputDir),
                "-n",
                "-q"
            };

            var bitrate = _configService.M4bConversionAudioBitrate;
            if (bitrate.IsNullOrWhiteSpace() || bitrate.Equals("auto", StringComparison.OrdinalIgnoreCase))
            {
                bitrate = GetAutoBitrate(sourceFiles);
            }

            if (bitrate.IsNotNullOrWhiteSpace())
            {
                args.Add($"--audio-bitrate={QuoteValue(bitrate)}");
            }

            if (_configService.M4bConversionSkipCover)
            {
                args.Add("--skip-cover");
            }

            if (_configService.M4bConversionUseFilenamesAsChapters)
            {
                args.Add("--use-filenames-as-chapters");
            }

            if (_configService.M4bConversionNoChapterReindexing)
            {
                args.Add("--no-chapter-reindexing");
            }

            if (_configService.M4bConversionAudioCodec.IsNotNullOrWhiteSpace())
            {
                args.Add($"--audio-codec={QuoteValue(_configService.M4bConversionAudioCodec)}");
            }

            if (_configService.M4bConversionAudioChannels != M4bConversionAudioChannels.FollowSource)
            {
                args.Add($"--audio-channels={(int)_configService.M4bConversionAudioChannels}");
            }

            if (_configService.M4bConversionJobs > 0)
            {
                args.Add($"--jobs={_configService.M4bConversionJobs}");
            }

            args.Add($"--output-file={Quote(outputFile)}");
            args.Add($"--logfile={Quote(logFile)}");

            if (_configService.M4bConversionExtraArguments.IsNotNullOrWhiteSpace())
            {
                args.Add(_configService.M4bConversionExtraArguments);
            }

            return args.ConcatToString(" ");
        }

        private string GetAutoBitrate(List<IFileInfo> sourceFiles)
        {
            var bitrates = new List<long>();

            foreach (var sourceFile in sourceFiles.Take(10))
            {
                try
                {
                    var args = $"-hide_banner -loglevel 0 -i {Quote(sourceFile.FullName)} -select_streams a -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1";
                    var output = _processProvider.StartAndCapture("ffprobe", args);
                    var value = output.Standard.Select(l => l.Content).FirstOrDefault(v => v.IsNotNullOrWhiteSpace());
                    if (output.ExitCode == 0 && long.TryParse(value, out var bitrate) && bitrate > 0)
                    {
                        bitrates.Add(bitrate);
                    }
                }
                catch (Exception ex)
                {
                    _logger.Debug(ex, "Unable to probe bitrate for {0}", sourceFile.FullName);
                }
            }

            if (!bitrates.Any())
            {
                return string.Empty;
            }

            bitrates.Sort();
            return bitrates[bitrates.Count / 2].ToString();
        }

        private void DeleteSource(string sourcePath)
        {
            if (sourcePath.IsNullOrWhiteSpace())
            {
                return;
            }

            if (_diskProvider.FileExists(sourcePath))
            {
                _logger.Debug("Deleting converted source file: {0}", sourcePath);
                _diskProvider.DeleteFile(sourcePath);
            }
            else if (_diskProvider.FolderExists(sourcePath))
            {
                _logger.Debug("Deleting converted source folder: {0}", sourcePath);
                _diskProvider.DeleteFolder(sourcePath, true);
            }
        }

        private void CleanupWorkDirectory(string workingDirectory)
        {
            if (workingDirectory.IsNotNullOrWhiteSpace() && _diskProvider.FolderExists(workingDirectory))
            {
                _diskProvider.DeleteFolder(workingDirectory, true);
            }
        }

        private static string Quote(string value)
        {
            return M4bToolService.Quote(value);
        }

        private static string QuoteValue(string value)
        {
            return Quote(value).Trim('"') == value ? value : Quote(value);
        }

        private static string SafeFileName(string value)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var builder = new StringBuilder(value.Length);
            foreach (var c in value)
            {
                builder.Append(invalid.Contains(c) ? '_' : c);
            }

            return builder.Length == 0 ? "audiobook" : builder.ToString();
        }

        private static string PadNumbers(string value)
        {
            return System.Text.RegularExpressions.Regex.Replace(value, "\\d+", m => m.Value.PadLeft(9, '0'));
        }
    }
}
