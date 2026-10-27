using NzbDrone.Core.Configuration;
using NzbDrone.Core.MediaFiles;
using NzbDrone.Core.MediaFiles.AudiobookConversion;
using NzbDrone.Core.Qualities;
using Readarr.Http.REST;

namespace Readarr.Api.V1.Config
{
    public class MediaManagementConfigResource : RestResource
    {
        public bool AutoUnmonitorPreviouslyDownloadedBooks { get; set; }
        public string RecycleBin { get; set; }
        public int RecycleBinCleanupDays { get; set; }
        public ProperDownloadTypes DownloadPropersAndRepacks { get; set; }
        public bool CreateEmptyAuthorFolders { get; set; }
        public bool DeleteEmptyFolders { get; set; }
        public FileDateType FileDate { get; set; }
        public bool WatchLibraryForChanges { get; set; }
        public RescanAfterRefreshType RescanAfterRefresh { get; set; }
        public AllowFingerprinting AllowFingerprinting { get; set; }

        public bool SetPermissionsLinux { get; set; }
        public string ChmodFolder { get; set; }
        public string ChownGroup { get; set; }

        public bool SkipFreeSpaceCheckWhenImporting { get; set; }
        public int MinimumFreeSpaceWhenImporting { get; set; }
        public bool CopyUsingHardlinks { get; set; }
        public bool ImportExtraFiles { get; set; }
        public string ExtraFileExtensions { get; set; }
        public bool ConvertAudiobooksToM4b { get; set; }
        public string M4bToolPath { get; set; }
        public string M4bConversionWorkingDirectory { get; set; }
        public M4bConversionSourceAction M4bConversionSourceAction { get; set; }
        public int M4bConversionJobs { get; set; }
        public string M4bConversionAudioCodec { get; set; }
        public string M4bConversionAudioBitrate { get; set; }
        public M4bConversionAudioChannels M4bConversionAudioChannels { get; set; }
        public bool M4bConversionUseSidecarChapters { get; set; }
        public bool M4bConversionUseSourceCover { get; set; }
        public bool M4bConversionUseFilenamesAsChapters { get; set; }
        public bool M4bConversionNoChapterReindexing { get; set; }
        public string M4bConversionExtraArguments { get; set; }
    }

    public static class MediaManagementConfigResourceMapper
    {
        public static MediaManagementConfigResource ToResource(IConfigService model)
        {
            return new MediaManagementConfigResource
            {
                AutoUnmonitorPreviouslyDownloadedBooks = model.AutoUnmonitorPreviouslyDownloadedBooks,
                RecycleBin = model.RecycleBin,
                RecycleBinCleanupDays = model.RecycleBinCleanupDays,
                DownloadPropersAndRepacks = model.DownloadPropersAndRepacks,
                CreateEmptyAuthorFolders = model.CreateEmptyAuthorFolders,
                DeleteEmptyFolders = model.DeleteEmptyFolders,
                FileDate = model.FileDate,
                WatchLibraryForChanges = model.WatchLibraryForChanges,
                RescanAfterRefresh = model.RescanAfterRefresh,
                AllowFingerprinting = model.AllowFingerprinting,

                SetPermissionsLinux = model.SetPermissionsLinux,
                ChmodFolder = model.ChmodFolder,
                ChownGroup = model.ChownGroup,

                SkipFreeSpaceCheckWhenImporting = model.SkipFreeSpaceCheckWhenImporting,
                MinimumFreeSpaceWhenImporting = model.MinimumFreeSpaceWhenImporting,
                CopyUsingHardlinks = model.CopyUsingHardlinks,
                ImportExtraFiles = model.ImportExtraFiles,
                ExtraFileExtensions = model.ExtraFileExtensions,
                ConvertAudiobooksToM4b = model.ConvertAudiobooksToM4b,
                M4bToolPath = model.M4bToolPath,
                M4bConversionWorkingDirectory = model.M4bConversionWorkingDirectory,
                M4bConversionSourceAction = model.M4bConversionSourceAction,
                M4bConversionJobs = model.M4bConversionJobs,
                M4bConversionAudioCodec = model.M4bConversionAudioCodec,
                M4bConversionAudioBitrate = model.M4bConversionAudioBitrate,
                M4bConversionAudioChannels = model.M4bConversionAudioChannels,
                M4bConversionUseSidecarChapters = model.M4bConversionUseSidecarChapters,
                M4bConversionUseSourceCover = model.M4bConversionUseSourceCover,
                M4bConversionUseFilenamesAsChapters = model.M4bConversionUseFilenamesAsChapters,
                M4bConversionNoChapterReindexing = model.M4bConversionNoChapterReindexing,
                M4bConversionExtraArguments = model.M4bConversionExtraArguments,
            };
        }
    }
}
