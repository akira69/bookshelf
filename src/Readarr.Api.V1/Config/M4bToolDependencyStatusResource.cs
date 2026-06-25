using System.Collections.Generic;
using System.Linq;
using NzbDrone.Core.MediaFiles.AudiobookConversion;

namespace Readarr.Api.V1.Config
{
    public class M4bToolDependencyStatusResource
    {
        public bool IsReady { get; set; }
        public string ToolPath { get; set; }
        public List<M4bToolDependencyStatusItemResource> Dependencies { get; set; }
    }

    public class M4bToolDependencyStatusItemResource
    {
        public string Name { get; set; }
        public bool Required { get; set; }
        public bool Available { get; set; }
        public string Version { get; set; }
        public string Error { get; set; }
    }

    public static class M4bToolDependencyStatusResourceMapper
    {
        public static M4bToolDependencyStatusResource ToResource(M4bToolDependencyStatus model)
        {
            return new M4bToolDependencyStatusResource
            {
                IsReady = model.IsReady,
                ToolPath = model.ToolPath,
                Dependencies = model.Dependencies.Select(ToResource).ToList()
            };
        }

        private static M4bToolDependencyStatusItemResource ToResource(M4bToolDependencyStatusItem model)
        {
            return new M4bToolDependencyStatusItemResource
            {
                Name = model.Name,
                Required = model.Required,
                Available = model.Available,
                Version = model.Version,
                Error = model.Error
            };
        }
    }
}
