namespace crud.Entities;

public class BookComment
{
    public int Id { get; set; }

    public int BookId { get; set; }
    public int AuthorUserId { get; set; }

    public string Content { get; set; } = string.Empty;
    public int Rating { get; set; } // 1..5
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Book? Book { get; set; }
}

