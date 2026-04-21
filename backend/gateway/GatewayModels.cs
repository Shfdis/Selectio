namespace gateway;

public sealed record GatewayIdentity(int UserId, string? Email, string? Name);

public enum AuthzRequirement
{
    Public,
    User,
    Owner,
    Moderator
}

public sealed record PostInfo(int Id, int CommunityId, int AuthorUserId, string Status);
public sealed record PostCommentInfo(int Id, int PostId, int AuthorUserId);
public sealed record BookCommentInfo(int Id, int BookId, int AuthorUserId);
public sealed record MemberRoleInfo(int CommunityId, int UserId, string Role);

public sealed record CommunityOwnerInfo(int OwnerUserId);

