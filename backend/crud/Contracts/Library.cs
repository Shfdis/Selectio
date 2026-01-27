using crud.Entities;

namespace crud.Contracts;

public sealed record AddToLibraryRequest(
    LibraryStatus? Status
);

public sealed record UpdateLibraryStatusRequest(
    LibraryStatus Status
);

public sealed record SetRatingRequest(
    int Rating
);

public sealed record UserLibraryItemDto(
    int BookId,
    string Title,
    string Author,
    string Description,
    string Genre,
    string CoverUrl,
    LibraryStatus Status,
    int? Rating
);

