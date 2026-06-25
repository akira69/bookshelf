using System.Collections.Generic;

namespace NzbDrone.Core.MediaFiles.AudiobookConversion
{
    public class M4bToolDependencyStatus
    {
        public bool IsReady { get; set; }
        public string ToolPath { get; set; }
        public bool UsesBundledTool { get; set; }
        public List<M4bToolDependencyStatusItem> Dependencies { get; set; } = new List<M4bToolDependencyStatusItem>();
    }

    public class M4bToolDependencyStatusItem
    {
        public string Name { get; set; }
        public bool Available { get; set; }
        public string Version { get; set; }
        public string Error { get; set; }
    }
}
