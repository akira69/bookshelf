using System.Collections.Generic;
using NzbDrone.Core.Messaging.Commands;

namespace NzbDrone.Core.MediaFiles.Commands
{
    public class ConvertExistingAudioToM4bCommand : Command
    {
        public List<int> BookIds { get; set; }
        public List<int> AuthorIds { get; set; }
        public bool All { get; set; }

        public override bool SendUpdatesToClient => true;
        public override bool RequiresDiskAccess => true;
    }
}
