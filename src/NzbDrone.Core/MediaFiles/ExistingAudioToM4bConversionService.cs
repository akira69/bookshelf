using System.Collections.Generic;
using System.IO.Abstractions;
using System.Linq;
using NLog;
using NzbDrone.Common.Disk;
using NzbDrone.Common.Extensions;
using NzbDrone.Core.Books;
using NzbDrone.Core.DecisionEngine;
using NzbDrone.Core.MediaFiles.AudiobookConversion;
using NzbDrone.Core.MediaFiles.BookImport;
using NzbDrone.Core.MediaFiles.Commands;
using NzbDrone.Core.Messaging.Commands;

namespace NzbDrone.Core.MediaFiles
{
    public class ExistingAudioToM4bConversionService : IExecute<ConvertExistingAudioToM4bCommand>
    {
        private readonly IBookService _bookService;
        private readonly IAuthorService _authorService;
        private readonly IEditionService _editionService;
        private readonly IMediaFileService _mediaFileService;
        private readonly IDiskProvider _diskProvider;
        private readonly IAudiobookConversionService _audiobookConversionService;
        private readonly IMakeImportDecision _importDecisionMaker;
        private readonly IImportApprovedBooks _importApprovedBooks;
        private readonly ICommandResultReporter _commandResultReporter;
        private readonly Logger _logger;

        public ExistingAudioToM4bConversionService(IBookService bookService,
                                                   IAuthorService authorService,
                                                   IEditionService editionService,
                                                   IMediaFileService mediaFileService,
                                                   IDiskProvider diskProvider,
                                                   IAudiobookConversionService audiobookConversionService,
                                                   IMakeImportDecision importDecisionMaker,
                                                   IImportApprovedBooks importApprovedBooks,
                                                   ICommandResultReporter commandResultReporter,
                                                   Logger logger)
        {
            _bookService = bookService;
            _authorService = authorService;
            _editionService = editionService;
            _mediaFileService = mediaFileService;
            _diskProvider = diskProvider;
            _audiobookConversionService = audiobookConversionService;
            _importDecisionMaker = importDecisionMaker;
            _importApprovedBooks = importApprovedBooks;
            _commandResultReporter = commandResultReporter;
            _logger = logger;
        }

        public void Execute(ConvertExistingAudioToM4bCommand message)
        {
            var books = GetBooks(message)
                .GroupBy(b => b.Id)
                .Select(g => g.First())
                .ToList();

            var converted = 0;
            foreach (var book in books)
            {
                if (ConvertBook(book))
                {
                    converted++;
                }
            }

            if (converted == 0)
            {
                _commandResultReporter.Report(CommandResult.Unsuccessful);
            }
        }

        private List<Book> GetBooks(ConvertExistingAudioToM4bCommand message)
        {
            if (message.All)
            {
                return _bookService.GetAllBooks();
            }

            var books = new List<Book>();
            if (message.BookIds?.Any() == true)
            {
                books.AddRange(_bookService.GetBooks(message.BookIds));
            }

            if (message.AuthorIds?.Any() == true)
            {
                foreach (var authorId in message.AuthorIds)
                {
                    books.AddRange(_bookService.GetBooksByAuthor(authorId));
                }
            }

            return books;
        }

        private bool ConvertBook(Book book)
        {
            var bookFiles = _mediaFileService.GetFilesByBook(book.Id)
                .Where(f => MediaFileExtensions.AudioExtensions.Contains(System.IO.Path.GetExtension(f.Path)))
                .ToList();

            if (!bookFiles.Any())
            {
                return false;
            }

            if (bookFiles.Count == 1 && System.IO.Path.GetExtension(bookFiles[0].Path).Equals(".m4b", System.StringComparison.OrdinalIgnoreCase))
            {
                _logger.Debug("Book already has a single M4B file: {0}", book);
                return false;
            }

            var diskFiles = new List<IFileInfo>();
            foreach (var bookFile in bookFiles)
            {
                if (_diskProvider.FileExists(bookFile.Path))
                {
                    diskFiles.Add(_diskProvider.GetFileInfo(bookFile.Path));
                }
            }

            if (!diskFiles.Any())
            {
                return false;
            }

            AudiobookConversionResult conversionResult;
            try
            {
                conversionResult = _audiobookConversionService.ConvertIfNeeded(book.Title, diskFiles);
            }
            catch (AudiobookConversionException e)
            {
                _logger.Warn(e, "Unable to convert existing book to M4B: {0}", book);
                return false;
            }

            if (!conversionResult.Converted)
            {
                return false;
            }

            try
            {
                var author = book.Author?.Value?.Id > 0 ? book.Author.Value : _authorService.GetAuthor(book.AuthorId);
                var editions = _editionService.GetEditionsByBook(book.Id);
                var edition = editions.FirstOrDefault(e => e.Monitored) ?? editions.FirstOrDefault();

                var idOverrides = new IdentificationOverrides
                {
                    Author = author,
                    Book = book,
                    Edition = edition
                };
                var idConfig = new ImportDecisionMakerConfig
                {
                    Filter = FilterFilesType.None,
                    NewDownload = true,
                    SingleRelease = true,
                    IncludeExisting = false,
                    AddNewAuthors = false
                };

                var decisions = _importDecisionMaker.GetImportDecisions(conversionResult.Files, idOverrides, null, idConfig);
                var importResults = _importApprovedBooks.Import(decisions, true, null, ImportMode.Move);
                var imported = importResults.Any(r => r.Result == ImportResultType.Imported);
                _audiobookConversionService.Cleanup(conversionResult, ImportMode.Copy, imported);
                return imported;
            }
            catch (System.Exception e)
            {
                _audiobookConversionService.Cleanup(conversionResult, ImportMode.Copy, false);
                _logger.Warn(e, "Unable to import converted M4B for existing book: {0}", book);
                return false;
            }
        }
    }
}
