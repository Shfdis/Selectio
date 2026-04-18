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

/// <summary>State of a book in the current user's library after add/update/rate.</summary>
public sealed record UserLibraryStateDto(
    int UserId,
    int BookId,
    LibraryStatus Status,
    int? Rating
);

public sealed record LibraryRemovedDto(string Message);

