using crud.Entities;

namespace crud.Contracts;

public sealed record PostDto(
    int Id,
    int CommunityId,
    int AuthorUserId,
    int BookId,
    string Content,
    string? PhotoUrl,
    PostStatus Status,
    DateTime CreatedAt
);

public sealed record CreatePostRequest(
    int CommunityId,
    int BookId,
    string Content,
    string? PhotoUrl
);

public sealed record UpdatePostRequest(
    string Content,
    string? PhotoUrl
);

