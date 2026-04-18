using crud.Entities;

namespace crud.Contracts;

public sealed record CommunityDto(
    int Id,
    string Name,
    string Description,
    string CoverUrl,
    string Genre,
    int OwnerUserId,
    int SubscriberCount
);

public sealed record CreateCommunityRequest(
    string Name,
    string? Description,
    string? CoverUrl,
    string? Genre
);

public sealed record CommunityMemberDto(
    int CommunityId,
    int UserId,
    CommunityRole Role
);

