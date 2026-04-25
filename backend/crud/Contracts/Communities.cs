using crud.Entities;

namespace crud.Contracts;

public sealed record CommunityDto(
    int Id,
    string Name,
    string Description,
    string CoverUrl,
    string[] Genres,
    int OwnerUserId,
    int SubscriberCount
);

public sealed record CreateCommunityRequest(
    string Name,
    string? Description,
    string? CoverUrl,
    string[]? Genres
);

/// <summary>Partial update; null fields leave the existing value unchanged.</summary>
public sealed record UpdateCommunityRequest(
    string? Name,
    string? Description,
    string? CoverUrl,
    string[]? Genres
);

public sealed record CommunityMemberDto(
    int CommunityId,
    int UserId,
    CommunityRole Role
);

