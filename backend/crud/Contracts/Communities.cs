using crud.Entities;

namespace crud.Contracts;

public sealed record CommunityDto(
    int Id,
    string Name,
    string Description,
    int OwnerUserId
);

public sealed record CreateCommunityRequest(
    string Name,
    string? Description
);

public sealed record CommunityMemberDto(
    int CommunityId,
    int UserId,
    CommunityRole Role
);

