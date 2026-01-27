namespace crud.Entities;

public class PostComment
{
    public int Id { get; set; }

    public int PostId { get; set; }
    public int AuthorUserId { get; set; }

    public string Content { get; set; } = string.Empty;
    public int? ParentCommentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Post? Post { get; set; }
}

