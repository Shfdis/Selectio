namespace crud.Entities;

public class SeenBook
{
    public int UserId { get; set; }
    public int BookId { get; set; }
    public DateTime SeenAt { get; set; } = DateTime.UtcNow;

    public Book? Book { get; set; }
}
