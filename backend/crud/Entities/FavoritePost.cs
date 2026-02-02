namespace crud.Entities;

public class FavoritePost
{
    public int UserId { get; set; }
    public int PostId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Post? Post { get; set; }
}

