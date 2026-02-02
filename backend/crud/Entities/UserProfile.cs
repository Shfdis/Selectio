namespace crud.Entities;

public class UserProfile
{
    public int UserId { get; set; }

    public string Username { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

