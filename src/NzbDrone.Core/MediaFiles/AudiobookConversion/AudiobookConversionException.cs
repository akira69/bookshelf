using System;

namespace NzbDrone.Core.MediaFiles.AudiobookConversion
{
    public class AudiobookConversionException : Exception
    {
        public AudiobookConversionException(string message)
            : base(message)
        {
        }

        public AudiobookConversionException(string message, Exception innerException)
            : base(message, innerException)
        {
        }
    }
}
