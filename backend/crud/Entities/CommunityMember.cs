namespace crud.Entities;

public enum CommunityRole
{
    Member = 0,
    Moderator = 1,
    Owner = 2
}

public class CommunityMember
{
    public int CommunityId { get; set; }
    public int UserId { get; set; }

    public CommunityRole Role { get; set; } = CommunityRole.Member;

    public Community? Community { get; set; }
}

