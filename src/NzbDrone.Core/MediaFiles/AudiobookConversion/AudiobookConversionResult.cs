using System.Collections.Generic;
using System.IO.Abstractions;

namespace NzbDrone.Core.MediaFiles.AudiobookConversion
{
    public class AudiobookConversionResult
    {
        public AudiobookConversionResult(List<IFileInfo> files)
        {
            Files = files;
        }

        public List<IFileInfo> Files { get; }
        public bool Converted { get; set; }
        public string WorkingDirectory { get; set; }
        public string SourcePath { get; set; }
    }
}
