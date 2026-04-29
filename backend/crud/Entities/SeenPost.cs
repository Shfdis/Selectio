namespace crud.Entities;

public class SeenPost
{
    public int UserId { get; set; }
    public int PostId { get; set; }
    public DateTime SeenAt { get; set; } = DateTime.UtcNow;

    public Post? Post { get; set; }
}

