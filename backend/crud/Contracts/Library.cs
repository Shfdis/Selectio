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
    string CoverUrl,
    LibraryStatus Status
);

/// <summary>State of a book in the current user's library after add/update/remove.</summary>
public sealed record UserLibraryStateDto(
    int UserId,
    int BookId,
    LibraryStatus Status
);

public sealed record LibraryRemovedDto(string Message);

