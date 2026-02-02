namespace crud.Contracts;

public sealed record FavoritePostDto(
    int PostId,
    int CommunityId,
    int AuthorUserId,
    int BookId,
    string Content,
    DateTime CreatedAt,
    DateTime FavoritedAt
);

