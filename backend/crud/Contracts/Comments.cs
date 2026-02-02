namespace crud.Contracts;

public sealed record PostCommentDto(
    int Id,
    int PostId,
    int AuthorUserId,
    string Content,
    DateTime CreatedAt
);

public sealed record BookCommentDto(
    int Id,
    int BookId,
    int AuthorUserId,
    string Content,
    int Rating,
    DateTime CreatedAt
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

