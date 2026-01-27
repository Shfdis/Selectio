namespace crud.Entities;

public class UserProfile
{
    // User ID from Auth service (no cross-DB FK).
    public int UserId { get; set; }

    public string Username { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

