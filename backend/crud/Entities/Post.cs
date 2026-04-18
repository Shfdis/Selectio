namespace crud.Entities;

public enum PostStatus
{
    Published = 0,
    Suggested = 1
}

public class Post
{
    public const int EmbeddingDimensions = 72;

    public int Id { get; set; }

    public int CommunityId { get; set; }
    public int AuthorUserId { get; set; }
    public int BookId { get; set; }

    public string Content { get; set; } = string.Empty;
    public string? PhotoUrl { get; set; }
    public PostStatus Status { get; set; } = PostStatus.Published;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public float[]? Embedding { get; set; }

    public Community? Community { get; set; }
    public Book? Book { get; set; }
}

