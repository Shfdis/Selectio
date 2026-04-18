namespace crud.Contracts;

public sealed record PostCommentDto(
    int Id,
    int PostId,
    int AuthorUserId,
    string AuthorUsername,
    string Content,
    DateTime CreatedAt
);

public sealed record BookCommentDto(
    int Id,
    int BookId,
    int AuthorUserId,
    string AuthorUsername,
    string Content,
    int Rating,
    DateTime CreatedAt
);

/// <summary>Minimal book fields for nested payloads (e.g. profile reviews list).</summary>
public sealed record BookCommentBookSummaryDto(
    int Id,
    string Title,
    string Author,
    string Genre,
    string CoverUrl
);

/// <summary>Book review by the current user with embedded book summary.</summary>
public sealed record MyBookCommentItemDto(
    int Id,
    int BookId,
    int AuthorUserId,
    string AuthorUsername,
    string Content,
    int Rating,
    DateTime CreatedAt,
    BookCommentBookSummaryDto Book
);

public sealed record CreateCommentRequest(
    string Content
);

public sealed record CreateBookCommentRequest(
    string Content,
    int Rating
);

public sealed record UpdateCommentRequest(
    string Content
);

