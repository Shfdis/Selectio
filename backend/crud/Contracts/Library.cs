using crud.Entities;

namespace crud.Contracts;

public sealed record AddToLibraryRequest(
    LibraryStatus? Status
);

public sealed record UpdateLibraryStatusRequest(
    LibraryStatus Status
);

public sealed record UserLibraryItemDto(
    int BookId,
    string Title,
    string Author,
    string Description,
    string Genre,
    string SecondGenre,
    string CoverUrl,
    LibraryStatus Status,
    DateTime AddedAt
);

/// <summary>State of a book in the current user's library after add/update/remove.</summary>
public sealed record UserLibraryStateDto(
    int UserId,
    int BookId,
    LibraryStatus Status,
    DateTime AddedAt
);

public sealed record LibraryRemovedDto(string Message);

