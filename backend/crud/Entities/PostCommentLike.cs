namespace crud.Entities;

public class PostCommentLike
{
    public int CommentId { get; set; }
    public int UserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public PostComment? Comment { get; set; }
}

