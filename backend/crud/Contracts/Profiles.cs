namespace crud.Contracts;

public sealed record PublicProfileDto(
    int UserId,
    string Username,
    string Description,
    string AvatarUrl
);

public sealed record UpdateProfileRequest(
    string Username,
    string? Description,
    string? AvatarUrl
);

